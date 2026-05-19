/**
 * useTabTitleBlink
 *
 * Alerts the admin when they switch away from the tab and there are pending
 * notifications.
 *
 * Effects applied when the tab is hidden AND count > 0:
 *  1. Tab favicon swaps to a red-dot SVG (visually "lights up" the tab).
 *  2. Tab title runs a marquee — the notification message scrolls left
 *     character-by-character so it catches the eye without just blinking.
 *
 * Everything is restored the moment the admin returns to the tab or count → 0.
 */

import { useEffect, useRef } from "react";

const ORIGINAL_TITLE = "PGC Visayas Admin";
const MARQUEE_SPEED_MS = 120; // ms per character step

/** Generates an inline SVG data-URI for a red notification dot favicon */
function redDotFaviconUrl(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="16" fill="#dc2626"/>
    <circle cx="16" cy="16" r="9" fill="#ffffff"/>
    <circle cx="16" cy="16" r="6"  fill="#dc2626"/>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Returns or creates the primary <link rel="icon"> element */
function getFaviconEl(): HTMLLinkElement {
  let el = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (!el) {
    el = document.createElement("link");
    el.rel = "icon";
    document.head.appendChild(el);
  }
  return el;
}

export function useTabTitleBlink(count: number): void {
  const intervalRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const originalFavRef  = useRef<string>("");
  const isActiveRef     = useRef(false);

  const stop = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (isActiveRef.current) {
      document.title = ORIGINAL_TITLE;
      const favEl = getFaviconEl();
      if (originalFavRef.current) favEl.href = originalFavRef.current;
      isActiveRef.current = false;
    }
  };

  const start = (notifCount: number) => {
    if (isActiveRef.current) return;
    isActiveRef.current = true;

    // Capture original favicon so we can restore it
    const favEl = getFaviconEl();
    originalFavRef.current = favEl.href;
    favEl.href = redDotFaviconUrl();

    // Build the marquee string — long enough to scroll visibly
    const label =
      notifCount === 1
        ? `🔴 1 new notification — PGC Visayas Admin`
        : `🔴 ${notifCount} new notifications — PGC Visayas Admin`;
    // Pad so the text wraps cleanly as it scrolls
    const padded = `${label}     `;
    let pos = 0;

    intervalRef.current = setInterval(() => {
      // Rotate: take characters from pos onward, wrap around
      const rotated = padded.slice(pos) + padded.slice(0, pos);
      document.title = rotated.slice(0, padded.length);
      pos = (pos + 1) % padded.length;
    }, MARQUEE_SPEED_MS);
  };

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        stop();
      } else if (count > 0) {
        start(count);
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    // If already hidden when count changes (e.g. count just became > 0), start now.
    if (count > 0 && document.visibilityState === "hidden") {
      // Restart with updated count even if already running
      stop();
      start(count);
    } else if (count === 0) {
      stop();
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);
}
