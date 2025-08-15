// Helper to recursively convert all nulls in an object to undefined (for parsed Zod output)
function nullsToUndefined(obj: any): any {
  if (obj === null) return undefined;
  if (Array.isArray(obj)) return obj.map(nullsToUndefined);
  if (typeof obj === "object" && obj !== null) {
    const out: any = {};
    for (const key in obj) {
      const v = obj[key];
      out[key] = v === null ? undefined : nullsToUndefined(v);
    }
    return out;
  }
  return obj;
}
// Helper to recursively convert all nulls in an object to undefined
function cleanNulls(obj: any): any {
  if (obj === null) return undefined;
  if (Array.isArray(obj)) return obj.map(cleanNulls);
  if (typeof obj === "object" && obj !== null) {
    const out: any = {};
    for (const key in obj) {
      const v = obj[key];
      out[key] = v === null ? undefined : v;
    }
    return out;
  }
  return obj;
}
// Service for fetching and generating client records from Firestore, with schema validation and ID generation.

import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Client } from "@/types/Client";
import { clientSchema } from "@/schemas/clientSchema";

// Helper to format a JS Date to MM-DD-YYYY string
function formatDateToMMDDYYYY(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
}

/**
 * Fetch all clients from Firestore, ordered by creation date (newest first).
 * Converts Firestore Timestamps to JS Dates and validates with Zod schema.
 * Returns only valid client records.
 */
export async function getClients(): Promise<Client[]> {
  try {
    const clientsRef = collection(db, "clients");
    const clientsQuery = query(clientsRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(clientsQuery);

    const clients: Client[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();

      // Convert Firestore Timestamps to JS Dates
      if (data.createdAt && typeof data.createdAt.toDate === "function") {
        data.createdAt = data.createdAt.toDate();
      }
      if (data.startDate && typeof data.startDate.toDate === "function") {
        data.startDate = data.startDate.toDate();
      }

      const candidate = cleanNulls({
        id: doc.id,
        ...data,
      });

      // Validate with Zod schema
      const result = clientSchema.safeParse(candidate);

      if (result.success) {
        const raw = result.data;
        // Convert all nulls to undefined to match Client interface
        const client: Client = nullsToUndefined(raw);
        clients.push(client);
      } else {
        // Log failed parses for debugging
        console.error("Client validation failed:", candidate, result.error);
      }
    });

  console.log("Fetched clients:", clients);
  return clients;
  } catch (error) {
    throw new Error("Failed to fetch clients from database");
  }
}

/**
 * Generate the next available client ID (cid) for a given year.
 * Looks for the highest existing cid for the year and increments it.
 * Returns a string like 'CL-2025-017'.
 */
export async function getNextCid(year: number): Promise<string> {
  const clientsRef = collection(db, "clients");
  const yearPrefix = `CL-${year}-`;

  const clientsQuery = query(
    clientsRef,
    where("cid", ">=", yearPrefix),
    where("cid", "<", `CL-${year + 1}-`)
  );

  const snapshot = await getDocs(clientsQuery);

  // Extract numerical part of cid (e.g., 016 from CL-2025-016)
  const numbers = snapshot.docs
    .map((doc) => {
      const cid = doc.data().cid as string;
      const match = cid?.match(/^CL-\d{4}-(\d{3})$/);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter((num): num is number => num !== null)
    .sort((a, b) => b - a); // descending

  const nextNum = (numbers[0] || 0) + 1;
  const padded = String(nextNum).padStart(3, "0");

  return `CL-${year}-${padded}`;
}
