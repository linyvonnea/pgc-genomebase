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
    const clientsQuery = query(clientsRef);
    const querySnapshot = await getDocs(clientsQuery);

    const clients: Client[] = [];
    let debugLog: any = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const clientId = data?.cid || doc.id;

      // DEBUG: Log original createdAt
      debugLog.push({
        cid: clientId,
        originalCreatedAt: data?.createdAt,
        type: typeof data?.createdAt,
      });

      // Convert Firestore Timestamps to ISO strings (serializable format)
      // This is critical because Firestore Timestamp objects can't be transferred to client as-is
      if (data?.createdAt) {
        if (typeof data.createdAt.toDate === "function") {
          try {
            const jsDate = data.createdAt.toDate();
            const isoString = jsDate.toISOString();
            console.log(`✅ ${clientId}: Converted Firestore Timestamp to ISO string:`, isoString);
            data.createdAt = isoString;
          } catch (err) {
            console.warn(`❌ Invalid createdAt for ${clientId}:`, data.createdAt, err);
            data.createdAt = new Date(0).toISOString();
          }
        } else if (typeof data.createdAt === 'string') {
          // Already a string, keep it
          console.log(`📝 ${clientId}: createdAt is already string:`, data.createdAt);
        } else if (typeof data.createdAt === 'object' && data.createdAt?._seconds !== undefined) {
          // Handle Firestore Timestamp with _seconds property
          try {
            const jsDate = new Date(data.createdAt._seconds * 1000 + (data.createdAt._nanoseconds || 0) / 1000000);
            const isoString = jsDate.toISOString();
            console.log(`✅ ${clientId}: Converted _seconds Timestamp to ISO string:`, isoString);
            data.createdAt = isoString;
          } catch (err) {
            console.warn(`❌ Failed to parse _seconds for ${clientId}`, err);
            data.createdAt = new Date().toISOString();
          }
        } else {
          console.warn(`⚠️  Unknown createdAt format for ${clientId}:`, typeof data.createdAt, data.createdAt);
          data.createdAt = new Date().toISOString();
        }
      } else {
        console.warn(`⚠️  Missing createdAt for ${clientId}, using current date`);
        data.createdAt = new Date().toISOString();
      }

      if (data?.startDate && typeof data.startDate.toDate === "function") {
        try {
          data.startDate = data.startDate.toDate().toISOString();
        } catch (err) {
          console.warn(`Error converting startDate for ${clientId}:`, err);
        }
      }

      // Normalize nulls -> undefined for better compatibility with TS types
      const candidate = cleanNulls({
        id: doc.id,
        ...data,
      });

      // Validate with Zod but DO NOT exclude documents on validation failure.
      // Push the parsed/cleaned object either way so all clients are returned.
      const result = clientSchema.safeParse(candidate);

      if (result.success) {
        const raw = result.data;
        clients.push(nullsToUndefined(raw));
      } else {
        // Log details for debugging but still include the record (cleaned)
        console.warn("Client validation failed (including raw candidate):", clientId, result.error);
        clients.push(nullsToUndefined(candidate));
      }
    });

    // DEBUG: Summary log
    console.group('🔍 getClients DEBUG INFO');
    console.log(`Total clients fetched: ${clients.length}`);
    console.log('CreatedAt formats after conversion:', debugLog.map((log: any) => ({
      cid: log.cid,
      originalType: log.type,
      originalValue: log.originalCreatedAt
    })));
    console.groupEnd();

    // ✅ Sort in memory by client ID in descending order (newest 2026 on top)
    // Client ID format: CL-YYYY-NNN, so string comparison works correctly
    // CL-2026-008 > CL-2025-309 > CL-2025-308
    clients.sort((a, b) => {
      const cidA = a.cid || "";
      const cidB = b.cid || "";
      return cidB.localeCompare(cidA); // descending (newest on top)
    });

    console.log("getClients: fetched count =", clients.length);
    if (clients.length) console.log("getClients: first client sample =", clients[0]);

    return clients;
  } catch (error) {
    console.error("getClients error:", error);
    return [];
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

/**
 * Check if a client ID already exists in the database.
 */
export async function checkCidExists(cid: string): Promise<boolean> {
  const clientsRef = collection(db, "clients");
  const clientsQuery = query(clientsRef, where("cid", "==", cid));
  const snapshot = await getDocs(clientsQuery);
  return !snapshot.empty;
}
