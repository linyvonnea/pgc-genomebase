import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  SampleFormMonitoringSummary,
  SampleFormRecord,
  SampleFormSummary,
} from "@/types/SampleForm";

const SAMPLE_FORMS_COLLECTION = "sampleForms";

export async function getSampleFormsByProjectId(
  projectId: string,
  options?: {
    submittedByEmail?: string;
    includeStatuses?: Array<"submitted" | "received" | "reviewed">;
  }
): Promise<SampleFormSummary[]> {
  if (!projectId) return [];

  const q = query(
    collection(db, SAMPLE_FORMS_COLLECTION),
    where("projectId", "==", projectId)
  );

  const snapshot = await getDocs(q);
  const statusAllow = new Set(
    options?.includeStatuses && options.includeStatuses.length > 0
      ? options.includeStatuses
      : (["received", "reviewed"] as const)
  );

  const normalizedEmail = options?.submittedByEmail?.trim().toLowerCase();

  const mapped = snapshot.docs
    .map((record) => {
      const data = record.data() as any;
      return {
        id: record.id,
        formSequence: Number(data.formSequence || 0) || undefined,
        documentNumber: data.documentNumber || undefined,
        status: data.status || "submitted",
        projectId: data.projectId || "",
        totalNumberOfSamples: Number(data.totalNumberOfSamples || 0),
        submittedByEmail: data.submittedByEmail || "",
        createdAt: data.createdAt,
      } as SampleFormSummary;
    })
    .filter((item) => statusAllow.has((item.status || "submitted") as any))
    .filter((item) => {
      if (!normalizedEmail) return true;
      return item.submittedByEmail?.trim().toLowerCase() === normalizedEmail;
    })
    .sort((a, b) => {
      const aMillis = (a.createdAt as any)?.toMillis?.() || 0;
      const bMillis = (b.createdAt as any)?.toMillis?.() || 0;
      return bMillis - aMillis;
    });

  return mapped;
}

export async function getSampleFormMonitoringSummary(
  projectId: string,
  submittedByEmail?: string
): Promise<SampleFormMonitoringSummary> {
  if (!projectId) {
    return { submittedCount: 0, receivedCount: 0, reviewedCount: 0 };
  }

  const q = query(
    collection(db, SAMPLE_FORMS_COLLECTION),
    where("projectId", "==", projectId)
  );

  const snapshot = await getDocs(q);
  const normalizedEmail = submittedByEmail?.trim().toLowerCase();

  let submittedCount = 0;
  let receivedCount = 0;
  let reviewedCount = 0;

  snapshot.docs.forEach((record) => {
    const data = record.data() as any;
    const ownerEmail = (data.submittedByEmail || "").trim().toLowerCase();
    if (normalizedEmail && ownerEmail !== normalizedEmail) return;

    const status = (data.status || "submitted") as
      | "submitted"
      | "received"
      | "reviewed";

    if (status === "submitted") submittedCount += 1;
    if (status === "received") receivedCount += 1;
    if (status === "reviewed") reviewedCount += 1;
  });

  return { submittedCount, receivedCount, reviewedCount };
}

export async function getSampleFormById(
  formId: string
): Promise<SampleFormRecord | null> {
  if (!formId) return null;

  const ref = doc(db, SAMPLE_FORMS_COLLECTION, formId);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) return null;

  const data = snapshot.data() as Omit<SampleFormRecord, "id">;
  return {
    ...data,
    id: snapshot.id,
  };
}

export async function markSampleFormAsReceived(
  formId: string,
  adminEmail: string
): Promise<void> {
  const ref = doc(db, SAMPLE_FORMS_COLLECTION, formId);
  await updateDoc(ref, {
    status: "received",
    adminReceivedBy: adminEmail,
    adminReceivedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function markSampleFormAsReviewed(
  formId: string,
  adminEmail: string
): Promise<void> {
  const ref = doc(db, SAMPLE_FORMS_COLLECTION, formId);
  await updateDoc(ref, {
    status: "reviewed",
    reviewedBy: adminEmail,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
