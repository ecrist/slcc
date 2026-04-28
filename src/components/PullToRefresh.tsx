"use client";

/**
 * Pull-to-refresh for iOS / Android home-screen PWAs.
 *
 * iOS Safari has a native pull-to-refresh in regular browser tabs, but when
 * the user adds the site to their home screen and launches it in standalone
 * mode the native gesture is gone — there's no browser chrome to attach it
 * to. This component reinstates the gesture *only* in that standalone shell,
 * so we don't double up on (or fight) the native one in browsers.
 *
 * Behavior:
 *   - Activates only when display-mode is standalone (or iOS legacy
 *     navigator.standalone is true).
 *   - Skips while a modal has body scroll locked.
 *   - Only intercepts when the window is scrolled to the top and the user
 *     drags downward — horizontal/upward gestures and mid-page scrolling
 *     are untouched.
 *   - Past the pull threshold a release triggers location.reload().
 */

import { useEffect, useRef, useState } from "react";

const THRESHOLD = 80;   // px of damped pull required to commit
const MAX_PULL = 140;   // hard cap so the indicator can't run off-screen

export default function PullToRefresh() {
  const [enabled, setEnabled] = useState(false);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Refs let the touch listeners read current values without re-binding.
  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);
  const activeRef = useRef(false);
  const refreshingRef = useRef(false);

  useEffect(() => {
    refreshingRef.current = refreshing;
  }, [refreshing]);

  // Detect standalone PWA mode once on mount
  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setEnabled(standalone);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const onTouchStart = (e: TouchEvent) => {
      if (refreshingRef.current) return;
      if (window.scrollY > 0) return;
      // Skip when body scroll is locked (modal open) — the user is
      // probably scrolling something inside the modal.
      if (document.body.style.overflow === "hidden") return;
      startY.current = e.touches[0].clientY;
      activeRef.current = false;
    };

    const setPageTransform = (offset: number, animate: boolean) => {
      const page = document.getElementById("ptr-page");
      if (!page) return;
      page.style.transition = animate ? "transform 250ms ease-out" : "none";
      page.style.transform = offset === 0 ? "" : `translate3d(0, ${offset}px, 0)`;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (refreshingRef.current || startY.current == null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) return; // upward / horizontal — ignore
      if (window.scrollY > 0) {
        startY.current = null;
        return;
      }
      activeRef.current = true;
      // Stop the elastic bounce so we own the gesture
      e.preventDefault();
      const damped = Math.min(MAX_PULL, dy * 0.5);
      pullRef.current = damped;
      setPull(damped);
      // Slide the page itself with the finger so the gesture feels native
      setPageTransform(damped, false);
    };

    const finish = () => {
      if (refreshingRef.current) return;
      const wasActive = activeRef.current;
      activeRef.current = false;
      startY.current = null;
      if (!wasActive) return;
      if (pullRef.current >= THRESHOLD) {
        setRefreshing(true);
        // Hold the page open just enough to keep the spinner visible
        // while we kick off the reload
        setPageTransform(64, true);
        setTimeout(() => window.location.reload(), 250);
      } else {
        pullRef.current = 0;
        setPull(0);
        setPageTransform(0, true);
      }
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    // Non-passive so we can preventDefault during a real pull
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", finish, { passive: true });
    document.addEventListener("touchcancel", finish, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", finish);
      document.removeEventListener("touchcancel", finish);
    };
  }, [enabled]);

  if (!enabled) return null;

  const ratio = Math.min(1, pull / THRESHOLD);
  // Mirror the page's translateY so the bar height equals the gap revealed.
  // Mid-drag keep `pull`; held-refresh state matches setPageTransform(64).
  const barHeight = refreshing ? 64 : pull;
  const opacity = refreshing ? 1 : ratio;
  // Smooth on release/refresh; instant while the finger is down.
  const isActiveDrag = pull > 0 && !refreshing;

  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 z-[60] pointer-events-none flex items-center justify-center overflow-visible"
      style={{
        height: `${barHeight}px`,
        transition: isActiveDrag ? "none" : "height 250ms ease-out",
      }}
    >
      <div
        style={{ opacity, transition: isActiveDrag ? "none" : "opacity 250ms ease-out" }}
        className={`w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center ${
          refreshing ? "animate-spin" : ""
        }`}
      >
        <svg
          className="w-5 h-5 text-swan-green"
          style={{ transform: refreshing ? undefined : `rotate(${ratio * 360}deg)` }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </div>
    </div>
  );
}
