import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  doc,
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
  const ref = await addDoc(collection(db, CHARGE_SLIPS_COLLECTION), {
    ...slip,
    dateIssued: convertToTimestamp(slip.dateIssued),
    dateOfOR: convertToTimestamp(slip.dateOfOR),
    createdAt: convertToTimestamp(slip.createdAt),
    client: {
      ...slip.client,
      createdAt: convertToTimestamp(slip.client.createdAt),
    },
    project: {
      ...slip.project,
      createdAt: convertToTimestamp(slip.project.createdAt),
    },
  });

  return ref.id;
}

export async function updateChargeSlip(id: string, updates: Partial<ChargeSlipRecord>) {
  const docRef = doc(db, CHARGE_SLIPS_COLLECTION, id);

  const updatedData: any = { ...updates };

  // Safely convert timestamp fields if provided
  if (updates.dateIssued) {
    updatedData.dateIssued = convertToTimestamp(updates.dateIssued);
  }
  if (updates.dateOfOR) {
    updatedData.dateOfOR = convertToTimestamp(updates.dateOfOR);
  }
  if (updates.createdAt) {
    updatedData.createdAt = convertToTimestamp(updates.createdAt);
  }

  // Safely convert nested client/project timestamps if provided
  if (updates.client?.createdAt) {
    updatedData.client = {
      ...updates.client,
      createdAt: convertToTimestamp(updates.client.createdAt),
    };
  }

  if (updates.project?.createdAt) {
    updatedData.project = {
      ...updates.project,
      createdAt: convertToTimestamp(updates.project.createdAt),
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