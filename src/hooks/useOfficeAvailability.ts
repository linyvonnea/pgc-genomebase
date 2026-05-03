"use client";

import { useState, useEffect, useRef } from "react";
import {
  subscribeToOfficeEvents,
  getOfficeCalendarSettings,
  checkAvailabilityNow,
  DEFAULT_OFFICE_CALENDAR_SETTINGS,
} from "@/services/officeCalendarService";
import {
  OfficeDayEvent,
  OfficeCalendarSettings,
  OfficeAvailabilityResult,
} from "@/types/OfficeCalendar";

/**
 * Returns the current office availability, updated in real-time as events
 * change in Firestore and re-evaluated every minute for time transitions.
 */
export function useOfficeAvailability(): OfficeAvailabilityResult | null {
  const [events, setEvents] = useState<OfficeDayEvent[]>([]);
  const [settings, setSettings] = useState<OfficeCalendarSettings>(
    DEFAULT_OFFICE_CALENDAR_SETTINGS
  );
  const [availability, setAvailability] = useState<OfficeAvailabilityResult | null>(null);
  const settingsLoadedRef = useRef(false);

  // Load settings once (they rarely change)
  useEffect(() => {
    let cancelled = false;
    getOfficeCalendarSettings().then((s) => {
      if (!cancelled) {
        setSettings(s);
        settingsLoadedRef.current = true;
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Subscribe to events in real-time
  useEffect(() => {
    return subscribeToOfficeEvents((evts) => setEvents(evts));
  }, []);

  // Re-evaluate availability whenever events/settings change or every minute
  useEffect(() => {
    const evaluate = () =>
      setAvailability(checkAvailabilityNow(events, settings));

    evaluate();

    const timer = setInterval(evaluate, 60_000);
    return () => clearInterval(timer);
  }, [events, settings]);

  return availability;
}
