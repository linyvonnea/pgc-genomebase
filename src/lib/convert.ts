// src/lib/convert.ts
import { Timestamp } from "firebase/firestore";

/** Converts Firestore timestamp or other input to JavaScript Date */
export function convertToDate(input: unknown): Date | undefined {
  if (!input) return undefined;
  if (input instanceof Date) return input;
  if (input instanceof Timestamp) return input.toDate();
  if (typeof input === "string" || typeof input === "number") return new Date(input);
  if ((input as any).toDate) return (input as any).toDate(); // fallback for edge cases
  return undefined;
}

/** Converts JS Date or compatible input to Firestore Timestamp */
export function convertToTimestamp(input: unknown): Timestamp | undefined {
  if (!input) return undefined;
  if (input instanceof Timestamp) return input;
  if (input instanceof Date) return Timestamp.fromDate(input);
  const parsed = new Date(input as string);
  return isNaN(parsed.getTime()) ? undefined : Timestamp.fromDate(parsed);
}