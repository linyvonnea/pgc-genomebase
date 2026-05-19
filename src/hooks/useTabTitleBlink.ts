/**
 * useTabTitleBlink
 *
 * Blinks the browser tab title to alert the admin when they are on a different
 * tab and there are pending notifications (unread messages, new inquiries,
 * pending approvals, charge-slip uploads, etc.).
 *
 * Behaviour:
 *  - Only starts blinking when `count > 0` AND the page is hidden.
 *  - Stops blinking (and restores original title) when the page becomes visible
 *    OR when `count` drops to 0.
 *  - Safe to mount multiple times — only the first blinking instance wins
 *    because they all write to the same `document.title`.
 */

import { useEffect, useRef } from "react";

const BLINK_INTERVAL_MS = 1000; // alternate every second
const ORIGINAL_TITLE = "PGC Visayas Admin";

export function useTabTitleBlink(count: number): void {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isBlinkingRef = useRef(false);

  const stopBlinking = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isBlinkingRef.current = false;
    document.title = ORIGINAL_TITLE;
  };

  const startBlinking = (notifCount: number) => {
    if (isBlinkingRef.current) return; // already blinking
    isBlinkingRef.current = true;

    const alertTitle =
      notifCount === 1
        ? `🔴 1 new notification`
        : `🔴 ${notifCount} new notifications`;

    let toggle = true;
    intervalRef.current = setInterval(() => {
      document.title = toggle ? alertTitle : ORIGINAL_TITLE;
      toggle = !toggle;
    }, BLINK_INTERVAL_MS);
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        stopBlinking();
      } else if (count > 0) {
        startBlinking(count);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // If the tab is already hidden when count changes, start immediately
    if (count > 0 && document.visibilityState === "hidden") {
      startBlinking(count);
    } else if (count === 0) {
      stopBlinking();
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stopBlinking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);
}
