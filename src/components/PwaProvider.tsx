"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type InstallStatus =
  | "unsupported"   // already standalone, or browser can't install
  | "android"       // beforeinstallprompt fired — we can call .prompt()
  | "ios";          // iOS Safari — show manual instructions modal

interface PwaContextValue {
  status: InstallStatus;
  /**
   * Trigger an install. On Android, fires the native prompt.
   * On iOS, opens the Add-to-Home-Screen instructions modal.
   * No-op if status is "unsupported".
   */
  install: () => void;
}

const PwaContext = createContext<PwaContextValue>({
  status: "unsupported",
  install: () => {},
});

/** Hook for components that want to surface an "Install App" entry point. */
export function usePwaInstall(): PwaContextValue {
  return useContext(PwaContext);
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  // iPad on iPadOS 13+ reports as Mac, hence the touch-points check
  const ua = navigator.userAgent;
  return /iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints! > 1);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function PwaProvider({ children }: { children: ReactNode }) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [status, setStatus] = useState<InstallStatus>("unsupported");
  const [iosModalOpen, setIosModalOpen] = useState(false);

  useEffect(() => {
    // Register service worker (skip in dev to avoid stale cache issues)
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {});
    }

    // Already installed — nothing to offer
    if (isStandalone()) {
      setStatus("unsupported");
      return;
    }

    // iOS Safari never fires beforeinstallprompt; offer manual instructions.
    if (isIOS()) {
      setStatus("ios");
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setStatus("android");
    };
    window.addEventListener("beforeinstallprompt", handler);

    // If the user installs via browser UI rather than our prompt, hide the entry point.
    const installedHandler = () => setStatus("unsupported");
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const install = useCallback(async () => {
    if (status === "android" && installPrompt) {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === "accepted") setStatus("unsupported");
      setInstallPrompt(null);
    } else if (status === "ios") {
      setIosModalOpen(true);
    }
  }, [status, installPrompt]);

  return (
    <PwaContext.Provider value={{ status, install }}>
      {children}
      {iosModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-install-title"
        >
          <div className="absolute inset-0 bg-black/50" onClick={() => setIosModalOpen(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md mx-0 sm:mx-4 p-6 animate-modal-in">
            <button
              onClick={() => setIosModalOpen(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-swan-green/10 flex items-center justify-center p-1.5">
                <img src="/icons/swan-logo.png" alt="" className="w-9 h-9 object-contain" />
              </div>
              <div>
                <h2 id="ios-install-title" className="text-lg font-bold text-swan-green">Install Swan Lake CC</h2>
                <p className="text-xs text-gray-500">Add to your iPhone home screen</p>
              </div>
            </div>
            <ol className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-swan-green text-white text-xs font-bold flex items-center justify-center">1</span>
                <span>
                  Tap the{" "}
                  <span className="inline-flex items-center align-middle">
                    {/* iOS Share icon */}
                    <svg className="inline w-5 h-5 text-blue-500 mx-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25l3-3m0 0l3 3m-3-3v10.5M5.25 13.5v4.5A2.25 2.25 0 007.5 20.25h9a2.25 2.25 0 002.25-2.25v-4.5" />
                    </svg>
                  </span>{" "}
                  <span className="font-semibold">Share</span> button at the bottom of Safari.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-swan-green text-white text-xs font-bold flex items-center justify-center">2</span>
                <span>
                  Scroll and tap <span className="font-semibold">Add to Home Screen</span>{" "}
                  <span className="inline-flex items-center align-middle">
                    <svg className="inline w-5 h-5 text-gray-700 mx-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </span>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-swan-green text-white text-xs font-bold flex items-center justify-center">3</span>
                <span>Tap <span className="font-semibold">Add</span> in the top-right corner.</span>
              </li>
            </ol>
            <p className="text-xs text-gray-500 mt-4 leading-relaxed">
              The app will launch full-screen from your home screen — no browser bars, plus pull-to-refresh, offline access, and faster loads.
            </p>
            <button
              onClick={() => setIosModalOpen(false)}
              className="btn-primary w-full mt-5"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </PwaContext.Provider>
  );
}
