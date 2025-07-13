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

/**
 * Save or overwrite a charge slip using chargeSlipNumber as the document ID.
 */
export async function saveChargeSlipToFirestore(chargeSlip: ChargeSlipRecord) {
  try {
    console.log("💾 Saving charge slip to Firestore:", chargeSlip);

    const docRef = doc(db, "chargeSlips", chargeSlip.chargeSlipNumber);

    const sanitizedChargeSlip = {
      ...chargeSlip,
      cid: chargeSlip.client?.cid || "", // ✅ flatten cid for easier querying
      projectId: chargeSlip.projectId,
      project: {
        ...chargeSlip.project,
        status:
          chargeSlip.project?.status &&
          ["Ongoing", "Cancelled", "Completed"].includes(chargeSlip.project.status)
            ? chargeSlip.project.status
            : "Ongoing",
        fundingCategory: chargeSlip.project?.fundingCategory || "General",
      },
    };

    await setDoc(docRef, sanitizedChargeSlip);
    console.log("✅ Charge slip saved successfully.");
  } catch (error) {
    console.error("❌ Error saving charge slip to Firestore:", error);
  }
}

/**
 * Get a single charge slip by its chargeSlipNumber (document ID).
 */
export async function getChargeSlipByNumber(
  chargeSlipNumber: string
): Promise<ChargeSlipRecord | null> {
  try {
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
          : data.dateIssued?.toDate().toISOString(),
    } as ChargeSlipRecord;
  } catch (error) {
    console.error("❌ Error fetching charge slip:", error);
    return null;
  }
}

/**
 * Get all charge slips in the database.
 */
export async function getAllChargeSlips(): Promise<ChargeSlipRecord[]> {
  try {
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
            : data.dateIssued?.toDate().toISOString(),
      } as ChargeSlipRecord);
    });

    return records;
  } catch (error) {
    console.error("❌ Error fetching all charge slips:", error);
    return [];
  }
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
 * Get charge slips by project ID.
 */
export async function getChargeSlipsByProjectId(projectId: string): Promise<ChargeSlipRecord[]> {
  try {
    console.log("📥 Fetching charge slips for projectId:", projectId);

    const slipsRef = collection(db, "chargeSlips");
    const q = query(
      slipsRef,
      where("projectId", "==", projectId),
      orderBy("dateIssued", "desc")
    );

    const snapshot = await getDocs(q);
    console.log("📸 Snapshot size:", snapshot.size);

    const records: ChargeSlipRecord[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      records.push({
        ...data,
        id: docSnap.id,
        dateIssued:
          typeof data.dateIssued === "string"
            ? data.dateIssued
            : data.dateIssued?.toDate().toISOString(),
      } as ChargeSlipRecord);
    });

    console.log("📦 Fetched charge slips:", records);
    return records;
  } catch (error) {
    console.error("❌ Error fetching charge slips by projectId:", error);
    return [];
  }
}

/**
 * (OPTIONAL) Get charge slips by both project ID and client ID.
 */
export async function getChargeSlipsByProjectAndClient(
  projectId: string,
  cid: string
): Promise<ChargeSlipRecord[]> {
  try {
    console.log(`📥 Fetching charge slips for projectId: ${projectId} and cid: ${cid}`);

    const slipsRef = collection(db, "chargeSlips");
    const q = query(
      slipsRef,
      where("projectId", "==", projectId),
      where("cid", "==", cid),
      orderBy("dateIssued", "desc")
    );

    const snapshot = await getDocs(q);
    console.log("📸 Snapshot size (project+client):", snapshot.size);

    const records: ChargeSlipRecord[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      records.push({
        ...data,
        id: docSnap.id,
        dateIssued:
          typeof data.dateIssued === "string"
            ? data.dateIssued
            : data.dateIssued?.toDate().toISOString(),
      } as ChargeSlipRecord);
    });

    return records;
  } catch (error) {
    console.error("❌ Error fetching charge slips by project + client:", error);
    return [];
  }
}