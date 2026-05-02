/**
 * Office Calendar Types
 *
 * Represents dates marked by admins as holidays, office activities, or closures.
 * Weekend configuration is stored separately to define which weekdays are non-working.
 *
 * Firestore:
 *   officeCalendar/{eventId}   — individual calendar events
 *   settings/officeCalendar    — weekend day configuration
 */

export type OfficeEventType = "holiday" | "activity" | "closure";

export const OFFICE_EVENT_LABELS: Record<OfficeEventType, string> = {
  holiday: "Holiday",
  activity: "Office Activity",
  closure: "Office Closure",
};

export const OFFICE_EVENT_COLORS: Record<OfficeEventType, { bg: string; text: string; border: string; dot: string }> = {
  holiday:  { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",    dot: "bg-red-500" },
  activity: { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200",  dot: "bg-amber-500" },
  closure:  { bg: "bg-slate-100", text: "text-slate-600",  border: "border-slate-200",  dot: "bg-slate-500" },
};

export interface OfficeDayEvent {
  id: string;
  /** ISO date string "YYYY-MM-DD" — deterministic, timezone-safe */
  date: string;
  type: OfficeEventType;
  title: string;
  description?: string;
  /**
   * When true the event recurs on this month/day every year (e.g. national holidays).
   * The stored `date` still serves as the canonical origin year.
   */
  recurringYearly?: boolean;
  createdBy: string; // admin email
  createdAt: any;    // Firestore Timestamp
  updatedAt: any;    // Firestore Timestamp
}

/** Persisted in settings/officeCalendar. Defines which day-of-week numbers are non-working. */
export interface OfficeCalendarSettings {
  /** 0 = Sunday … 6 = Saturday */
  weekendDays: number[];
  updatedAt?: any;
  updatedBy?: string;
}

/** Shape returned by the service — combines events + settings for a given month range */
export interface MonthCalendarData {
  events: OfficeDayEvent[];
  settings: OfficeCalendarSettings;
}
