/**
 * Office Calendar Service
 *
 * Manages office calendar events (holidays, activities, closures)
 * and weekend-day configuration.
 *
 * Firestore layout:
 *   officeCalendar/{eventId}  — one document per event
 *   settings/officeCalendar   — weekend configuration singleton
 *
 * Design decisions:
 *  - Dates are stored as "YYYY-MM-DD" strings for deterministic cross-timezone querying.
 *  - Recurring-yearly events are stored once; clients resolve recurrence at read time.
 *  - Real-time subscriptions use onSnapshot so the calendar UI stays live across tabs.
 *  - Writes are guarded with permission checks at the component layer (PermissionGuard).
 *  - No PII is stored; only admin email for attribution.
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  setDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  OfficeDayEvent,
  OfficeCalendarSettings,
  OfficeEventType,
  OfficeAvailabilityResult,
} from "@/types/OfficeCalendar";

// ─── Collection / document references ────────────────────────────────────────

const EVENTS_COLLECTION = "officeCalendar";
const SETTINGS_COLLECTION = "settings";
const CALENDAR_SETTINGS_DOC = "officeCalendar";

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_WEEKEND_DAYS: number[] = [0, 6]; // 0=Sunday, 6=Saturday
export const DEFAULT_OFFICE_HOURS = { start: 8, end: 17 }; // 08:00–17:00

export const DEFAULT_OFFICE_CALENDAR_SETTINGS: OfficeCalendarSettings = {
  weekendDays: DEFAULT_WEEKEND_DAYS,
  officeHours: DEFAULT_OFFICE_HOURS,
};

// ─── Settings ─────────────────────────────────────────────────────────────────

/** Fetch schedule settings. Returns defaults if not yet initialised. */
export async function getOfficeCalendarSettings(): Promise<OfficeCalendarSettings> {
  try {
    const ref = doc(db, SETTINGS_COLLECTION, CALENDAR_SETTINGS_DOC);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      return {
        weekendDays: Array.isArray(data.weekendDays) ? data.weekendDays : DEFAULT_WEEKEND_DAYS,
        officeHours: data.officeHours ?? DEFAULT_OFFICE_HOURS,
        updatedAt: data.updatedAt,
        updatedBy: data.updatedBy,
      };
    }
    return { ...DEFAULT_OFFICE_CALENDAR_SETTINGS };
  } catch (err) {
    console.error("officeCalendarService: getOfficeCalendarSettings", err);
    return { ...DEFAULT_OFFICE_CALENDAR_SETTINGS };
  }
}

/** Persist schedule settings (supports partial updates). */
export async function saveOfficeCalendarSettings(
  settings: Partial<Pick<OfficeCalendarSettings, "weekendDays" | "officeHours">>,
  updatedBy: string
): Promise<void> {
  const ref = doc(db, SETTINGS_COLLECTION, CALENDAR_SETTINGS_DOC);
  await setDoc(
    ref,
    {
      ...settings,
      updatedBy,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

// ─── Events ───────────────────────────────────────────────────────────────────

/** Add a new calendar event. Returns the new document ID. */
export async function addOfficeEvent(
  event: Omit<OfficeDayEvent, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const ref = await addDoc(collection(db, EVENTS_COLLECTION), {
    ...event,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Update an existing calendar event (partial update). */
export async function updateOfficeEvent(
  id: string,
  updates: Partial<Omit<OfficeDayEvent, "id" | "createdAt">>
): Promise<void> {
  const ref = doc(db, EVENTS_COLLECTION, id);
  await updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/** Delete a calendar event by ID. */
export async function deleteOfficeEvent(id: string): Promise<void> {
  await deleteDoc(doc(db, EVENTS_COLLECTION, id));
}

/**
 * Fetch all events once (for SSR / initial load).
 * Consider using subscribeToOfficeEvents for live UIs.
 */
export async function getAllOfficeEvents(): Promise<OfficeDayEvent[]> {
  const snap = await getDocs(
    query(collection(db, EVENTS_COLLECTION), orderBy("date", "asc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as OfficeDayEvent));
}

/**
 * Real-time subscription to all office calendar events.
 * Returns an unsubscribe function.
 */
export function subscribeToOfficeEvents(
  onChange: (events: OfficeDayEvent[]) => void
): () => void {
  const q = query(collection(db, EVENTS_COLLECTION), orderBy("date", "asc"));
  return onSnapshot(q, (snap) => {
    const events = snap.docs.map((d) => ({ id: d.id, ...d.data() } as OfficeDayEvent));
    onChange(events);
  });
}

// ─── Query helpers ────────────────────────────────────────────────────────────

/**
 * Given a display date ("YYYY-MM-DD") and the full event list, return all events
 * that apply to that day — including yearly-recurring events matched by month/day.
 */
export function getEventsForDate(
  date: string,
  allEvents: OfficeDayEvent[]
): OfficeDayEvent[] {
  const [year, month, day] = date.split("-");
  return allEvents.filter((ev) => {
    if (ev.date === date) return true;
    if (ev.recurringYearly) {
      const [, evMonth, evDay] = ev.date.split("-");
      return evMonth === month && evDay === day;
    }
    return false;
  });
}

/**
 * Returns a human-readable availability message for a given date.
 * Useful for injecting into the chat bot context.
 *
 * @param date        "YYYY-MM-DD"
 * @param allEvents   full list of events (from subscribeToOfficeEvents)
 * @param weekendDays configured non-working days (0–6)
 */
export function getAvailabilityMessage(
  date: string,
  allEvents: OfficeDayEvent[],
  weekendDays: number[]
): string | null {
  const dateObj = new Date(date + "T00:00:00");
  const dayOfWeek = dateObj.getDay();

  const events = getEventsForDate(date, allEvents);
  const holiday = events.find((e) => e.type === "holiday");
  const closure = events.find((e) => e.type === "closure");
  const activities = events.filter((e) => e.type === "activity");

  if (holiday) {
    return `📅 ${holiday.title} — The office is closed on this day. We will be back on the next working day.`;
  }
  if (closure) {
    return `🚫 ${closure.title} — The office is temporarily closed. ${closure.description ?? ""}`.trim();
  }
  if (weekendDays.includes(dayOfWeek)) {
    return "🏖️ The office is closed on weekends. Please reach out during regular working days.";
  }
  if (activities.length > 0) {
    const list = activities.map((a) => a.title).join("; ");
    return `📋 Note: The office has scheduled activities today (${list}). Response times may be delayed.`;
  }
  return null;
}

// ─── Availability check (for auto-reply) ─────────────────────────────────────

const MANILA_TZ = "Asia/Manila";

/**
 * Convert a JS Date to its equivalent local time components in Asia/Manila.
 * Returns { dateStr: "YYYY-MM-DD", hour: 0-23, dayOfWeek: 0-6 }.
 *
 * Uses Intl.DateTimeFormat.formatToParts() — spec-compliant and reliable
 * in all modern runtimes (Node 18+, Vercel, browsers) unlike the brittle
 * `new Date(toLocaleString(...))` approach which can produce Invalid Date.
 */
export function getPhilippineDateTime(now: Date = new Date()): {
  dateStr: string;
  hour: number;
  minute: number;
  dayOfWeek: number;
} {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TZ,
    year:    "numeric",
    month:   "2-digit",
    day:     "2-digit",
    hour:    "2-digit",
    minute:  "2-digit",
    weekday: "short",
    hour12:  false,
  });

  const parts = Object.fromEntries(
    fmt.formatToParts(now).map((p) => [p.type, p.value])
  );

  // hour12:false can emit "24" for midnight — normalise to 0
  let hour = parseInt(parts.hour ?? "0", 10);
  if (hour === 24) hour = 0;

  const WEEKDAY_INDEX: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const dayOfWeek = WEEKDAY_INDEX[parts.weekday ?? ""] ?? 0;

  return {
    dateStr: `${parts.year}-${parts.month}-${parts.day}`,
    hour,
    minute: parseInt(parts.minute ?? "0", 10),
    dayOfWeek,
  };
}

/**
 * Pure function — determines current office availability and returns a
 * structured result suitable for an auto-reply message.
 *
 * Priority order: holiday > closure > weekend > outside_hours > activity > open
 *
 * @param allEvents   live list from subscribeToOfficeEvents / getAllOfficeEvents
 * @param settings    calendar settings (weekendDays + officeHours)
 * @param now         injectable for testing; defaults to new Date()
 */
export function checkAvailabilityNow(
  allEvents: OfficeDayEvent[],
  settings: OfficeCalendarSettings,
  now: Date = new Date()
): OfficeAvailabilityResult {
  const { dateStr, hour, dayOfWeek } = getPhilippineDateTime(now);
  const { weekendDays, officeHours } = settings;
  const events = getEventsForDate(dateStr, allEvents);

  const formatHours = (h: number) => {
    const suffix = h >= 12 ? "PM" : "AM";
    const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${display}:00 ${suffix}`;
  };
  const openStr  = formatHours(officeHours.start);
  const closeStr = formatHours(officeHours.end);
  const hoursNote = `Office Hours: ${openStr} – ${closeStr}, Monday to Friday`;

  // 1. Holiday
  const holiday = events.find((e) => e.type === "holiday");
  if (holiday) {
    const desc = holiday.description ? ` ${holiday.description}` : "";
    return {
      isOpen: false,
      reason: "holiday",
      autoReplyMessage:
        `🎉 Thank you for your message! Today is a holiday — **${holiday.title}**.${desc} ` +
        `The office is currently closed. Your message has been received and our team will get back to you on the next working day.\n\n` +
        `📌 ${hoursNote}`,
    };
  }

  // 2. Office closure
  const closure = events.find((e) => e.type === "closure");
  if (closure) {
    const desc = closure.description ? ` ${closure.description}` : "";
    return {
      isOpen: false,
      reason: "closure",
      autoReplyMessage:
        `🚫 Thank you for your message! The office is temporarily closed — **${closure.title}**.${desc} ` +
        `Your message has been received and our team will respond as soon as we return.\n\n` +
        `📌 ${hoursNote}`,
    };
  }

  // 3. Weekend
  if (weekendDays.includes(dayOfWeek)) {
    return {
      isOpen: false,
      reason: "weekend",
      autoReplyMessage:
        `🏖️ Thank you for your message! Today is the weekend and the office is currently closed. ` +
        `Your message has been received and our team will get back to you on the next working day.\n\n` +
        `📌 ${hoursNote}`,
    };
  }

  // 4. Outside office hours (weekday but wrong time)
  if (hour < officeHours.start || hour >= officeHours.end) {
    const timeOfDay = hour < officeHours.start ? "not yet open" : "already closed";
    return {
      isOpen: false,
      reason: "outside_hours",
      autoReplyMessage:
        `🕐 Thank you for your message! Our office is ${timeOfDay} at this time. ` +
        `Your message has been received and our team will respond during the next available working hours.\n\n` +
        `📌 ${hoursNote}`,
    };
  }

  // 5. Partial closure — a specific time window when the office is closed today
  const partial = events.find(
    (e) => e.type === "partial_closure" &&
      typeof e.closedFrom === "number" &&
      typeof e.closedUntil === "number" &&
      hour >= e.closedFrom! &&
      hour < e.closedUntil!
  );
  if (partial) {
    const fromStr  = formatHours(partial.closedFrom!);
    const untilStr = formatHours(partial.closedUntil!);
    const desc = partial.description ? ` ${partial.description}` : "";
    return {
      isOpen: false,
      reason: "partial_closure",
      autoReplyMessage:
        `🕐 Thank you for your message! The office is temporarily unavailable from **${fromStr}** to **${untilStr}** today — **${partial.title}**.${desc} ` +
        `Your message has been received and our team will respond once we are back.\n\n` +
        `📌 ${hoursNote}`,
    };
  }

  // 6. Open but has activities — still respond, but note possible delays
  const activities = events.filter((e) => e.type === "activity");
  if (activities.length > 0) {
    const list = activities.map((a) => a.title).join(", ");
    return {
      isOpen: true,
      reason: "activity",
      autoReplyMessage:
        `📋 Thank you for your message! Please note that the office has the following activity today: **${list}**. ` +
        `Response times may be slightly delayed. Our team will get back to you as soon as possible.`,
    };
  }

  // 6. Open and no special conditions
  return { isOpen: true, reason: "open", autoReplyMessage: "" };
}
