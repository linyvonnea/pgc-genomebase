import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  setDoc,
  getDoc,
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

  console.log(`[Firestore] Found ${snapshot.size} quotations for inquiryId: ${inquiryId}`);

  const records: QuotationRecord[] = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    const { clientInfo = {}, ...rest } = data;

    records.push({
    ...rest,
    ...clientInfo, // flatten name, institution, etc
    id: doc.id,
    dateIssued: typeof data.dateIssued === "string"
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
  snapshot.forEach((doc) => {
    const data = doc.data();
    records.push({
      ...data,
      id: doc.id,
      dateIssued:
        typeof data.dateIssued === "string"
          ? data.dateIssued
          : data.dateIssued.toDate().toISOString(),
    } as QuotationRecord);
  });

  return records;
}



/**
 * Generates the next reference number from Firestore quotations.
 * Format: VMENF-Q-YYYY-XXX
 */
export async function generateNextReferenceNumber(currentYear: number): Promise<string> {
  const prefix = `VMENF-Q-${currentYear}`;
  const quotationsRef = collection(db, "quotations");

  const q = query(
    quotationsRef,
    where("referenceNumber", ">=", `${prefix}-000`),
    where("referenceNumber", "<=", `${prefix}-999`),
    orderBy("referenceNumber", "desc")
  );

  const snapshot = await getDocs(q);

  let nextNumber = 1;

  if (!snapshot.empty) {
    const lastRef = snapshot.docs[0].data().referenceNumber;
    const lastNum = parseInt(lastRef.split("-").pop() || "0", 10);
    nextNumber = lastNum + 1;
  }

  const padded = String(nextNumber).padStart(3, "0");
  return `${prefix}-${padded}`;
}