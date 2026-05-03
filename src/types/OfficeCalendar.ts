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

export type OfficeEventType = "holiday" | "activity" | "closure" | "partial_closure";

export const OFFICE_EVENT_LABELS: Record<OfficeEventType, string> = {
  holiday: "Holiday",
  activity: "Office Activity",
  closure: "Office Closure",
  partial_closure: "Partial Closure",
};

export const OFFICE_EVENT_COLORS: Record<OfficeEventType, { bg: string; text: string; border: string; dot: string }> = {
  holiday:         { bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200",     dot: "bg-red-500" },
  activity:        { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   dot: "bg-amber-500" },
  closure:         { bg: "bg-slate-100",  text: "text-slate-600",   border: "border-slate-200",   dot: "bg-slate-500" },
  partial_closure: { bg: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-200",  dot: "bg-violet-500" },
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
  /**
   * For partial_closure events: the hour (0–23, PST) when the closure starts.
   * e.g. 13 means no office from 1:00 PM.
   */
  closedFrom?: number;
  /**
   * For partial_closure events: the hour (0–23, PST) when the closure ends.
   * e.g. 17 means no office until 5:00 PM.
   */
  closedUntil?: number;
  /**
   * Optional admin-customized auto-reply message for this specific event.
   * When set, overrides the system-generated message in checkAvailabilityNow.
   */
  customAutoReply?: string;
  createdBy: string; // admin email
  createdAt: any;    // Firestore Timestamp
  updatedAt: any;    // Firestore Timestamp
}

/** Configurable office hours (24-hour format, e.g. { start: 8, end: 17 }). */
export interface OfficeHours {
  /** Hour of day when office opens, 0–23 (e.g. 8) */
  start: number;
  /** Hour of day when office closes, 0–23, exclusive (e.g. 17 means up to 16:59) */
  end: number;
}

/** Persisted in settings/officeCalendar. Defines which day-of-week numbers are non-working. */
export interface OfficeCalendarSettings {
  /** 0 = Sunday … 6 = Saturday */
  weekendDays: number[];
  /** Office working hours in Asia/Manila timezone */
  officeHours: OfficeHours;
  /** Customizable chat widget header shown to clients */
  widgetHeader?: {
    /** Title shown in the chat widget header. Defaults to "PGC Visayas Support" */
    title: string;
  };
  updatedAt?: any;
  updatedBy?: string;
}

/** Structured result from checkAvailabilityNow() */
export interface OfficeAvailabilityResult {
  isOpen: boolean;
  /** Reason code for programmatic use */
  reason: "open" | "outside_hours" | "weekend" | "holiday" | "closure" | "partial_closure" | "activity";
  /** Human-readable message ready to be sent to the client */
  autoReplyMessage: string;
}

/** Shape returned by the service — combines events + settings for a given month range */
export interface MonthCalendarData {
  events: OfficeDayEvent[];
  settings: OfficeCalendarSettings;
}
