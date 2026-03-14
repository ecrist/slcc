"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  price: number;
  label: string;
  onToken: (token: string) => void;
  onError: (message: string) => void;
}

type SquarePaymentMethod = {
  attach: (selector: string) => Promise<void>;
  destroy: () => Promise<void>;
  tokenize: () => Promise<{ status: string; token?: string; errors?: { message: string }[] }>;
};

declare global {
  interface Window {
    Square?: {
      payments: (
        appId: string,
        locationId: string
      ) => {
        googlePay: (req: object) => Promise<SquarePaymentMethod>;
        applePay: (req: object) => Promise<SquarePaymentMethod>;
        paymentRequest: (opts: object) => object;
      };
    };
  }
}

export default function SquareWalletButtons({ price, label, onToken, onError }: Props) {
  const [googlePayReady, setGooglePayReady] = useState(false);
  const [applePayReady, setApplePayReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const googlePayRef = useRef<SquarePaymentMethod | null>(null);
  const applePayRef = useRef<SquarePaymentMethod | null>(null);

  const appId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID || "";
  const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || "";
  const isSandbox = process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT !== "production";

  useEffect(() => {
    if (!appId || !locationId) {
      setLoading(false);
      return;
    }

    const scriptSrc = isSandbox
      ? "https://sandbox.web.squarecdn.com/v1/square.js"
      : "https://web.squarecdn.com/v1/square.js";

    let script = document.querySelector<HTMLScriptElement>(`script[src="${scriptSrc}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = scriptSrc;
      document.head.appendChild(script);
    }

    const init = async () => {
      if (!window.Square) return;

      const payments = window.Square.payments(appId, locationId);
      const paymentRequest = payments.paymentRequest({
        countryCode: "US",
        currencyCode: "USD",
        total: { amount: price.toFixed(2), label },
      });

      // Google Pay
      try {
        const gp = await payments.googlePay(paymentRequest);
        await gp.attach("#google-pay-button");
        googlePayRef.current = gp;
        setGooglePayReady(true);
      } catch {
        // Google Pay not available in this browser
      }

      // Apple Pay
      try {
        const ap = await payments.applePay(paymentRequest);
        await ap.attach("#apple-pay-button");
        applePayRef.current = ap;
        setApplePayReady(true);
      } catch {
        // Apple Pay not available in this browser
      }

      setLoading(false);
    };

    if (window.Square) {
      init();
    } else {
      script.addEventListener("load", init);
    }

    return () => {
      googlePayRef.current?.destroy().catch(() => {});
      applePayRef.current?.destroy().catch(() => {});
    };
  }, [appId, locationId, price, label, isSandbox]);

  const handleGooglePay = async () => {
    if (!googlePayRef.current) return;
    const result = await googlePayRef.current.tokenize();
    if (result.status === "OK" && result.token) {
      onToken(result.token);
    } else {
      onError(result.errors?.[0]?.message || "Google Pay failed");
    }
  };

  const handleApplePay = async () => {
    if (!applePayRef.current) return;
    const result = await applePayRef.current.tokenize();
    if (result.status === "OK" && result.token) {
      onToken(result.token);
    } else {
      onError(result.errors?.[0]?.message || "Apple Pay failed");
    }
  };

  if (!appId || !locationId) return null;

  if (loading) {
    return (
      <div className="flex gap-3">
        <div className="flex-1 h-12 bg-gray-100 rounded-lg animate-pulse" />
        <div className="flex-1 h-12 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!googlePayReady && !applePayReady) return null;

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        {googlePayReady && (
          <div className="flex-1">
            <div id="google-pay-button" onClick={handleGooglePay} className="cursor-pointer" />
          </div>
        )}
        {applePayReady && (
          <div className="flex-1">
            <div id="apple-pay-button" onClick={handleApplePay} className="cursor-pointer" />
          </div>
        )}
      </div>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-gray-400">or pay another way</span>
        </div>
      </div>
    </div>
  );
}
