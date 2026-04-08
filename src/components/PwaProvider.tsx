"use client";

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaProvider() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {});
    }

    // Check if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Capture install prompt (Android/Chrome)
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      // Show banner after 30s if not dismissed before
      const dismissed = sessionStorage.getItem("pwa-banner-dismissed");
      if (!dismissed) setTimeout(() => setShowBanner(true), 30_000);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setShowBanner(false);
    setInstallPrompt(null);
  }

  function dismiss() {
    setShowBanner(false);
    sessionStorage.setItem("pwa-banner-dismissed", "1");
  }

  if (!showBanner || isInstalled) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-6 md:w-80">
      <div className="bg-swan-dark text-white rounded-2xl shadow-2xl p-4 flex items-start gap-3 border border-swan-gold/20">
        <img src="/icons/icon.svg" alt="" className="w-12 h-12 rounded-xl shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Install Swan Lake CC</p>
          <p className="text-white/60 text-xs mt-0.5">Add to your home screen for quick access.</p>
          <div className="flex gap-2 mt-3">
            <button onClick={install} className="flex-1 bg-swan-gold text-swan-dark text-xs font-semibold py-1.5 rounded-lg hover:bg-swan-gold-light transition-colors">
              Install
            </button>
            <button onClick={dismiss} className="px-3 text-white/50 text-xs hover:text-white/80 transition-colors">
              Later
            </button>
          </div>
        </div>
        <button onClick={dismiss} className="text-white/40 hover:text-white/70 text-lg leading-none shrink-0">×</button>
      </div>
    </div>
  );
}
