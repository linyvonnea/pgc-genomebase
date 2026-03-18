import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SampleFormData, SampleFormRecord, SampleFormSummary } from "@/types/SampleForm";

const SAMPLE_FORMS_COLLECTION = "sampleForms";

export async function createSampleForm(
  payload: SampleFormData & {
    inquiryId: string;
    projectId: string;
    projectTitle?: string;
    submittedByEmail: string;
    submittedByName?: string;
  }
): Promise<string> {
  const ref = collection(db, SAMPLE_FORMS_COLLECTION);
  const result = await addDoc(ref, {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return result.id;
}

export async function getSampleFormsByProjectId(
  projectId: string
): Promise<SampleFormSummary[]> {
  if (!projectId) return [];

  const q = query(
    collection(db, SAMPLE_FORMS_COLLECTION),
    where("projectId", "==", projectId)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((record) => {
    const data = record.data() as any;
    return {
      id: record.id,
      projectId: data.projectId || "",
      totalNumberOfSamples: Number(data.totalNumberOfSamples || 0),
      submittedByEmail: data.submittedByEmail || "",
      createdAt: data.createdAt,
    } as SampleFormSummary;
  });
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
