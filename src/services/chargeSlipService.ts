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
import { ChargeSlipRecord } from "@/types/ChargeSlipRecord";
import { getClientById, getProjectById } from "./clientProjectService";

/**
 * Save or overwrite a charge slip using chargeSlipNumber as the document ID.
 */
export async function saveChargeSlipToFirestore(chargeSlip: ChargeSlipRecord) {
  const docRef = doc(db, "chargeSlips", chargeSlip.chargeSlipNumber);
  await setDoc(docRef, chargeSlip);
}

/**
 * Get a single charge slip by its chargeSlipNumber (document ID).
 */
export async function getChargeSlipByNumber(
  chargeSlipNumber: string
): Promise<ChargeSlipRecord | null> {
  const docRef = doc(db, "chargeSlips", chargeSlipNumber);
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
  } as ChargeSlipRecord;
}

/**
 * Get all charge slips in the database.
 */
export async function getAllChargeSlips(): Promise<ChargeSlipRecord[]> {
  const q = query(collection(db, "chargeSlips"), orderBy("dateIssued", "desc"));
  const snapshot = await getDocs(q);

  const records: ChargeSlipRecord[] = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    records.push({
      ...data,
      id: doc.id,
      dateIssued:
        typeof data.dateIssued === "string"
          ? data.dateIssued
          : data.dateIssued.toDate().toISOString(),
    } as ChargeSlipRecord);
  });

  return records;
}

/**
 * Generates the next charge slip number.
 * Format: CS-YYYY-XXX
 */
export async function generateNextChargeSlipNumber(currentYear: number): Promise<string> {
  const prefix = `CS-${currentYear}`;
  const slipsRef = collection(db, "chargeSlips");

  const q = query(
    slipsRef,
    where("chargeSlipNumber", ">=", `${prefix}-000`),
    where("chargeSlipNumber", "<=", `${prefix}-999`),
    orderBy("chargeSlipNumber", "desc")
  );

  const snapshot = await getDocs(q);

  let nextNumber = 1;
  if (!snapshot.empty) {
    const lastRef = snapshot.docs[0].data().chargeSlipNumber;
    const lastNum = parseInt(lastRef.split("-").pop() || "0", 10);
    nextNumber = lastNum + 1;
  }

  const padded = String(nextNumber).padStart(3, "0");
  return `${prefix}-${padded}`;
}

/**
 * Get charge slips by project ID, ordered by date issued.
 */
export async function getChargeSlipsByProjectId(projectId: string): Promise<ChargeSlipRecord[]> {
  const slipsRef = collection(db, "chargeSlips");
  const q = query(slipsRef, where("projectId", "==", projectId), orderBy("dateIssued", "desc"));

  const snapshot = await getDocs(q);
  const records: ChargeSlipRecord[] = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();

    // Fetch client and project details
    const client = data.client?.cid ? await getClientById(data.client.cid) : null;
    const project = data.project?.pid ? await getProjectById(data.project.pid) : null;

    records.push({
      ...data,
      id: doc.id,
      client: client || data.client, // Fallback to existing client data if fetch fails
      project: project || data.project, // Fallback to existing project data if fetch fails
      dateIssued:
        typeof data.dateIssued === "string"
          ? data.dateIssued
          : data.dateIssued.toDate().toISOString(),
    } as ChargeSlipRecord);
  }

  return records;
}