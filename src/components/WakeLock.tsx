"use client";

import { useEffect } from "react";

export default function WakeLock() {
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;

    let lock: WakeLockSentinel | null = null;

    async function acquire() {
      try {
        lock = await (navigator as Navigator & { wakeLock: { request(type: string): Promise<WakeLockSentinel> } }).wakeLock.request("screen");
      } catch {
        // Wake lock not granted — not critical
      }
    }

    acquire();

    // Re-acquire when tab becomes visible again
    function onVisible() {
      if (document.visibilityState === "visible") acquire();
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => {});
    };
  }, []);

  return null;
}
