import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  where,
  orderBy,
  query,
  Timestamp,
  limit,
} from "firebase/firestore";
import { ChargeSlipRecord } from "@/types/ChargeSlipRecord";
import { convertToDate, convertToTimestamp } from "@/lib/convert";
import { Client } from "@/types/Client";
import { Project } from "@/types/Project";

const CHARGE_SLIPS_COLLECTION = "chargeSlips";

// Helper to safely convert timestamps only if defined
const safeTimestamp = (value: any) =>
  value ? convertToTimestamp(value) : convertToTimestamp(new Date());

export async function getAllChargeSlips(): Promise<ChargeSlipRecord[]> {
  const snapshot = await getDocs(
    query(collection(db, CHARGE_SLIPS_COLLECTION)
    //orderBy("chargeSlipNumber", "desc"))
  );

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as any;

    const clientData: Client = {
      ...data.client,
      createdAt: convertToDate(data.client?.createdAt),
    };

    const projectData: Project = {
      ...data.project,
      createdAt: convertToDate(data.project?.createdAt),
    };

    return {
      ...data,
      id: docSnap.id,
      client: clientData,
      project: projectData,
      dateIssued: convertToDate(data.dateIssued),
      dateOfOR: convertToDate(data.dateOfOR),
      createdAt: convertToDate(data.createdAt),
    };
  });
}

export async function getChargeSlipById(id: string): Promise<ChargeSlipRecord | null> {
  const docRef = doc(db, CHARGE_SLIPS_COLLECTION, id);
  const snap = await getDoc(docRef);

  if (!snap.exists()) return null;

  const data = snap.data() as any;

  return {
    ...data,
    id: snap.id,
    client: {
      ...data.client,
      createdAt: convertToDate(data.client?.createdAt),
    },
    project: {
      ...data.project,
      createdAt: convertToDate(data.project?.createdAt),
    },
    dateIssued: convertToDate(data.dateIssued),
    dateOfOR: convertToDate(data.dateOfOR),
    createdAt: convertToDate(data.createdAt),
  };
}

export async function saveChargeSlip(slip: ChargeSlipRecord): Promise<string> {
  const docRef = doc(db, CHARGE_SLIPS_COLLECTION, slip.chargeSlipNumber);

  const payload: any = {
    ...slip,
    dateIssued: safeTimestamp(slip.dateIssued),
    dateOfOR: slip.dateOfOR ? convertToTimestamp(slip.dateOfOR) : null,
    createdAt: safeTimestamp(slip.createdAt),
    client: {
      ...slip.client,
      createdAt: safeTimestamp(slip.client?.createdAt),
    },
    project: {
      ...slip.project,
      createdAt: safeTimestamp(slip.project?.createdAt),
    },
  };

  await setDoc(docRef, payload);
  return slip.chargeSlipNumber;
}

export async function updateChargeSlip(id: string, updates: Partial<ChargeSlipRecord>) {
  const docRef = doc(db, CHARGE_SLIPS_COLLECTION, id);

  const updatedData: any = {};

  if ("dvNumber" in updates) updatedData.dvNumber = updates.dvNumber;
  if ("orNumber" in updates) updatedData.orNumber = updates.orNumber;
  if ("status" in updates) {
    updatedData.status = updates.status;
    if (updates.status === "paid") {
      updatedData.datePaid = Timestamp.fromDate(new Date());
    } else {
      updatedData.datePaid = null;
    }
  }
  if ("notes" in updates) updatedData.notes = updates.notes;

  if ("dateIssued" in updates) {
    updatedData.dateIssued = safeTimestamp(updates.dateIssued);
  }

  if ("dateOfOR" in updates) {
    updatedData.dateOfOR = updates.dateOfOR
      ? convertToTimestamp(updates.dateOfOR)
      : null;
  }

  if ("createdAt" in updates) {
    updatedData.createdAt = safeTimestamp(updates.createdAt);
  }

  if (updates.client) {
    updatedData.client = {
      ...updates.client,
      ...(updates.client.createdAt && {
        createdAt: safeTimestamp(updates.client.createdAt),
      }),
    };
  }

  if (updates.project) {
    updatedData.project = {
      ...updates.project,
      ...(updates.project.createdAt && {
        createdAt: safeTimestamp(updates.project.createdAt),
      }),
    };
  }

  await updateDoc(docRef, updatedData);
}

export async function getChargeSlipsByProjectId(projectId: string): Promise<ChargeSlipRecord[]> {
  const snapshot = await getDocs(
    query(
      collection(db, CHARGE_SLIPS_COLLECTION),
      where("projectId", "==", projectId)
      //orderBy("dateIssued", "desc")
    )
  );

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as any;

    return {
      ...data,
      id: docSnap.id,
      client: {
        ...data.client,
        createdAt: convertToDate(data.client?.createdAt),
      },
      project: {
        ...data.project,
        createdAt: convertToDate(data.project?.createdAt),
      },
      dateIssued: convertToDate(data.dateIssued),
      dateOfOR: convertToDate(data.dateOfOR),
      createdAt: convertToDate(data.createdAt),
    };
  });
}

/**
 * Generates the next charge slip number for a given year.
 * Format: CS-YYYY-XXX (zero-padded to 3 digits while < 1000; from 1000 upward no padding)
 */
export async function generateNextChargeSlipNumber(year: number): Promise<string> {
  const prefix = `CS-${year}`;
  const lower = `${prefix}-`;                  // inclusive: "CS-2025-"
  const upper = `CS-${year + 1}-`;             // exclusive: "CS-2026-"

  const qRef = query(
    collection(db, CHARGE_SLIPS_COLLECTION),
    where("chargeSlipNumber", ">=", lower),
    where("chargeSlipNumber", "<", upper),
    orderBy("chargeSlipNumber", "desc"),
    limit(1)
  );

  const snapshot = await getDocs(qRef);

  let nextNumber = 1;
  if (!snapshot.empty) {
    const last: string =
      snapshot.docs[0].data().chargeSlipNumber ?? snapshot.docs[0].id;
    const lastNum = parseInt(last.split("-").pop() || "0", 10);
    if (!Number.isNaN(lastNum)) nextNumber = lastNum + 1;
  }

  const suffix =
    nextNumber < 1000
      ? String(nextNumber).padStart(3, "0")
      : String(nextNumber);

  return `${prefix}-${suffix}`;
}