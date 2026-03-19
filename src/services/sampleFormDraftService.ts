import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { SampleFormData } from "@/types/SampleForm";

export async function saveSampleFormDraft(inquiryId: string, data: SampleFormData) {
  if (!inquiryId) return;
  const draftRef = doc(db, "sampleFormDrafts", inquiryId);
  await setDoc(draftRef, {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function getSampleFormDraft(inquiryId: string): Promise<SampleFormData | null> {
  if (!inquiryId) return null;
  const draftRef = doc(db, "sampleFormDrafts", inquiryId);
  const snap = await getDoc(draftRef);
  if (snap.exists()) {
    return snap.data() as SampleFormData;
  }
  return null;
}

export async function deleteSampleFormDraft(inquiryId: string) {
  if (!inquiryId) return;
  const draftRef = doc(db, "sampleFormDrafts", inquiryId);
  await deleteDoc(draftRef);
}
