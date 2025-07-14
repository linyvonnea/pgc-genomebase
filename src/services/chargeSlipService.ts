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
} from "firebase/firestore";
import { ChargeSlipRecord } from "@/types/ChargeSlipRecord";
import { convertToDate, convertToTimestamp } from "@/lib/convert";
import { Client } from "@/types/Client";
import { Project } from "@/types/Project";

const CHARGE_SLIPS_COLLECTION = "chargeSlips";

// ✅ Helper to safely convert timestamps only if defined
const safeTimestamp = (value: any) =>
  value ? convertToTimestamp(value) : convertToTimestamp(new Date());

export async function getAllChargeSlips(): Promise<ChargeSlipRecord[]> {
  const snapshot = await getDocs(
    query(collection(db, CHARGE_SLIPS_COLLECTION), orderBy("dateIssued", "desc"))
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
  if ("status" in updates) updatedData.status = updates.status;
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
      where("projectId", "==", projectId),
      orderBy("dateIssued", "desc")
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

export async function generateNextChargeSlipNumber(year: number): Promise<string> {
  const prefix = `CS-${year}`;
  const q = query(
    collection(db, CHARGE_SLIPS_COLLECTION),
    where("chargeSlipNumber", ">=", `${prefix}-000`),
    where("chargeSlipNumber", "<=", `${prefix}-999`),
    orderBy("chargeSlipNumber", "desc")
  );

  const snapshot = await getDocs(q);
  const latest = snapshot.docs[0]?.data()?.chargeSlipNumber;

  const nextNum = latest ? parseInt(latest.split("-")[2], 10) + 1 : 1;
  return `${prefix}-${String(nextNum).padStart(3, "0")}`;
}