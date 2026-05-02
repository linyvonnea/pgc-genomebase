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
} from "@/types/OfficeCalendar";

// ─── Collection / document references ────────────────────────────────────────

const EVENTS_COLLECTION = "officeCalendar";
const SETTINGS_COLLECTION = "settings";
const CALENDAR_SETTINGS_DOC = "officeCalendar";

// Saturday and Sunday by default
const DEFAULT_WEEKEND_DAYS: number[] = [0, 6]; // 0=Sunday, 6=Saturday

// ─── Settings ─────────────────────────────────────────────────────────────────

/** Fetch the weekend-day configuration. Returns defaults if not yet initialised. */
export async function getOfficeCalendarSettings(): Promise<OfficeCalendarSettings> {
  try {
    const ref = doc(db, SETTINGS_COLLECTION, CALENDAR_SETTINGS_DOC);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      return {
        weekendDays: Array.isArray(data.weekendDays) ? data.weekendDays : DEFAULT_WEEKEND_DAYS,
        updatedAt: data.updatedAt,
        updatedBy: data.updatedBy,
      };
    }
    return { weekendDays: DEFAULT_WEEKEND_DAYS };
  } catch (err) {
    console.error("officeCalendarService: getOfficeCalendarSettings", err);
    return { weekendDays: DEFAULT_WEEKEND_DAYS };
  }
}

/** Persist weekend-day configuration. */
export async function saveOfficeCalendarSettings(
  settings: Pick<OfficeCalendarSettings, "weekendDays">,
  updatedBy: string
): Promise<void> {
  const ref = doc(db, SETTINGS_COLLECTION, CALENDAR_SETTINGS_DOC);
  await setDoc(
    ref,
    {
      weekendDays: settings.weekendDays,
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
