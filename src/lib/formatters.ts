// src/lib/formatters.ts

import { Timestamp } from "firebase/firestore";

export function normalizeDate(date: string | Timestamp | null | undefined): string {
  if (!date) return "";

  if (typeof date === "string") {
    return date;
  }

  if (date instanceof Timestamp) {
    return date.toDate().toISOString();
  }

  return "";
}