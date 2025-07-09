// src/lib/generateReferenceNumber.ts

import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";

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