// src/lib/formatters.ts

import { Timestamp } from "firebase/firestore";

export function normalizeDate(date: string | Timestamp | Date | null | undefined): string {
  if (!date) return new Date().toISOString();

  if (date instanceof Timestamp) {
    return date.toDate().toISOString();
  }

  if (date instanceof Date) {
    return date.toISOString();
  }

  if (typeof date === "string") {
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  }

  return new Date().toISOString();
}