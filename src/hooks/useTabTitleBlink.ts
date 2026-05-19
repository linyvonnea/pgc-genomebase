/**
 * useTabTitleBlink
 *
 * Alerts the admin when there are pending notifications — regardless of
 * whether the tab is visible or hidden.
 *
 * Effects applied when count > 0:
 *  1. Tab favicon alternates between a light-red filled SVG and the original
 *     favicon every BLINK_INTERVAL_MS, creating a visible "blinking" effect
 *     in the browser tab strip.
 *  2. Tab title alternates between the notification message and the original
 *     title in sync with the favicon blink.
 *
 * Everything is restored the moment count → 0 or the component unmounts.
 */

import { useEffect, useRef } from "react";

const ORIGINAL_TITLE = "PGC Visayas Admin";
const BLINK_INTERVAL_MS = 600; // ms per blink phase

/** Generates an inline SVG data-URI for a light-red filled tab favicon */
function redFaviconUrl(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
    <rect width="32" height="32" rx="4" fill="#fca5a5"/>
    <circle cx="16" cy="16" r="8" fill="#dc2626"/>
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
  const intervalRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const originalFavRef = useRef<string>("");
  const isActiveRef    = useRef(false);
  const phaseRef       = useRef(false); // false = notification state, true = original state

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
      phaseRef.current = false;
    }
  };

  const start = (notifCount: number) => {
    // Always restart so the label reflects the latest count
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isActiveRef.current = true;

    // Capture the original favicon on first activation
    const favEl = getFaviconEl();
    if (!originalFavRef.current) {
      originalFavRef.current = favEl.href;
    }

    const notifTitle =
      notifCount === 1
        ? `🔴 1 new notification — PGC Visayas Admin`
        : `🔴 ${notifCount} new notifications — PGC Visayas Admin`;

    const redFav = redFaviconUrl();

    // Start in the "alert" phase immediately
    document.title = notifTitle;
    favEl.href = redFav;
    phaseRef.current = false;

    intervalRef.current = setInterval(() => {
      phaseRef.current = !phaseRef.current;
      if (phaseRef.current) {
        // "Off" phase — show original
        document.title = ORIGINAL_TITLE;
        favEl.href = originalFavRef.current;
      } else {
        // "On" phase — show alert
        document.title = notifTitle;
        favEl.href = redFav;
      }
    }, BLINK_INTERVAL_MS);
  };

  useEffect(() => {
    if (count > 0) {
      start(count);
    } else {
      stop();
    }

    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);
}
