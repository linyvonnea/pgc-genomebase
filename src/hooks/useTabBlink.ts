"use client";

/**
 * useTabBlink
 *
 * Blinks the browser tab title when there are unread notifications and the
 * user is on a different tab.  Stops blinking as soon as the user returns.
 *
 * Usage:
 *   useTabBlink(unreadCount, "💬 New message – PGC Visayas");
 */

import { useEffect, useRef } from "react";

export function useTabBlink(
  unreadCount: number,
  alertTitle: string,
  intervalMs = 1000,
) {
  const originalTitleRef = useRef<string>("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isBlinkingRef = useRef(false);

  const stopBlink = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    // Restore original title only when we were the one who changed it
    if (isBlinkingRef.current && originalTitleRef.current) {
      document.title = originalTitleRef.current;
    }
    isBlinkingRef.current = false;
  };

  const startBlink = () => {
    if (isBlinkingRef.current) return; // already blinking
    originalTitleRef.current = document.title;
    isBlinkingRef.current = true;

    let toggle = false;
    intervalRef.current = setInterval(() => {
      document.title = toggle ? originalTitleRef.current : alertTitle;
      toggle = !toggle;
    }, intervalMs);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        stopBlink();
      } else if (document.visibilityState === "hidden" && unreadCount > 0) {
        startBlink();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // If tab is already hidden when unread count changes, start blinking immediately
    if (document.visibilityState === "hidden" && unreadCount > 0) {
      startBlink();
    }

    // If there are no unread items, stop blinking
    if (unreadCount === 0) {
      stopBlink();
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadCount, alertTitle]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopBlink();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
