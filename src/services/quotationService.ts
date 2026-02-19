
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  setDoc,
  getDoc,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { QuotationRecord } from "@/types/Quotation";

/**
 * Get all quotations related to a specific inquiry ID.
 */
export async function getQuotationsByInquiryId(
  inquiryId: string
): Promise<QuotationRecord[]> {
  const quotationsRef = collection(db, "quotations");
  const q = query(
    quotationsRef,
    where("inquiryId", "==", inquiryId),
    orderBy("dateIssued", "desc")
  );

  const snapshot = await getDocs(q);

  console.log(
    `[Firestore] Found ${snapshot.size} quotations for inquiryId: ${inquiryId}`
  );

  const records: QuotationRecord[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const { clientInfo = {}, ...rest } = data;

    records.push({
      ...rest,
      ...clientInfo, // flatten name, institution, etc
      id: docSnap.id,
      dateIssued:
        typeof data.dateIssued === "string"
          ? data.dateIssued
          : data.dateIssued.toDate().toISOString(),
    } as QuotationRecord);
  });

  return records;
}

/**
 * Get all quotations related to a specific client name.
 */
export async function getQuotationsByClientName(
  clientName: string
): Promise<QuotationRecord[]> {
  // Return empty array if clientName is empty or invalid
  if (!clientName || clientName.trim().length === 0) {
    console.log("[Firestore] Empty client name provided, returning empty array");
    return [];
  }

  const quotationsRef = collection(db, "quotations");
  const q = query(
    quotationsRef,
    where("name", "==", clientName),
    orderBy("dateIssued", "desc")
  );

  const snapshot = await getDocs(q);

  console.log(
    `[Firestore] Found ${snapshot.size} quotations for client: ${clientName}`
  );

  const records: QuotationRecord[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const { clientInfo = {}, ...rest } = data;

    records.push({
      ...rest,
      ...clientInfo, // flatten name, institution, etc
      id: docSnap.id,
      dateIssued:
        typeof data.dateIssued === "string"
          ? data.dateIssued
          : data.dateIssued.toDate().toISOString(),
    } as QuotationRecord);
  });

  return records;
}

/**
 * Save or overwrite a quotation using referenceNumber as the document ID.
 */
export async function saveQuotationToFirestore(quotation: QuotationRecord) {
  const docRef = doc(db, "quotations", quotation.referenceNumber);
  await setDoc(docRef, quotation);
}

/**
 * Get a single quotation by its reference number (document ID).
 */
export async function getQuotationByReferenceNumber(
  refNumber: string
): Promise<QuotationRecord | null> {
  const docRef = doc(db, "quotations", refNumber);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) return null;

  const data = snapshot.data();
  return {
    ...data,
    id: snapshot.id,
    dateIssued:
      typeof data.dateIssued === "string"
        ? data.dateIssued
        : data.dateIssued.toDate().toISOString(),
  } as QuotationRecord;
}

/**
 * Get all quotations in the database.
 */
export async function getAllQuotations(): Promise<QuotationRecord[]> {
  const q = query(collection(db, "quotations"), orderBy("dateIssued", "desc"));
  const snapshot = await getDocs(q);

  const records: QuotationRecord[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    records.push({
      ...data,
      id: docSnap.id,
      dateIssued:
        typeof data.dateIssued === "string"
          ? data.dateIssued
          : data.dateIssued.toDate().toISOString(),
    } as QuotationRecord);
  });

  return records;
}

/**
 * Generates the next reference number with a global counter that
 * does NOT reset per year.
 *
 * Examples:
 *  - Existing highest: VMENF-Q-2021-002
 *    currentYear = 2022  => VMENF-Q-2022-003
 *  - Existing highest: VMENF-Q-2025-099
 *    currentYear = 2026  => VMENF-Q-2026-100
 *  - Existing highest: VMENF-Q-2026-999
 *    currentYear = 2027  => VMENF-Q-2027-1000  (no padding ≥ 1000)
 */
export async function generateNextReferenceNumber(
  currentYear: number
): Promise<string> {
  const prefixForYear = `VMENF-Q-${currentYear}`;

  // Get the lexicographically last reference across ALL years.
  const qRef = query(
    collection(db, "quotations"),
    orderBy("referenceNumber", "desc"),
    limit(1)
  );

  const snapshot = await getDocs(qRef);

  let nextNumber = 1;
  if (!snapshot.empty) {
    const lastRef: string =
      snapshot.docs[0].data().referenceNumber ?? snapshot.docs[0].id;

    // Extract trailing numeric segment after the last hyphen
    const parts = lastRef.split("-");
    const lastNum = parseInt(parts[parts.length - 1] || "0", 10);
    if (!Number.isNaN(lastNum)) nextNumber = lastNum + 1;
  }

  // Pad to 3 digits while < 1000; no padding once we hit 1000+
  const suffix =
    nextNumber < 1000
      ? String(nextNumber).padStart(3, "0")
      : String(nextNumber);

  return `${prefixForYear}-${suffix}`;
}