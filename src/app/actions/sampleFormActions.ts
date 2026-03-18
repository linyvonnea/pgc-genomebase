// src/app/actions/sampleFormActions.ts
// Server Actions for Sample Forms — mirrors the pattern in quotationActions.ts.
"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/services/activityLogService";
import { markSampleFormAsReceived, markSampleFormAsReviewed } from "@/services/sampleFormService";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SampleFormRecord } from "@/types/SampleForm";

// ─────────────────────────────────────────────────────────────────────────────
// Status updates
// ─────────────────────────────────────────────────────────────────────────────

export async function markSampleFormReceivedAction(
  formId: string,
  adminEmail: string,
  adminName: string
) {
  try {
    await markSampleFormAsReceived(formId, adminEmail);

    await logActivity({
      userId: adminEmail,
      userEmail: adminEmail,
      userName: adminName,
      action: "UPDATE",
      entityType: "sample_form",
      entityId: formId,
      entityName: `Sample Form ${formId}`,
      description: `Marked sample form ${formId} as received`,
      changesAfter: { status: "received" },
    });

    revalidatePath("/admin/sample-forms");
    return { success: true };
  } catch (error) {
    console.error("markSampleFormReceivedAction error:", error);
    return { success: false, error: "Failed to mark form as received." };
  }
}

export async function markSampleFormReviewedAction(
  formId: string,
  adminEmail: string,
  adminName: string
) {
  try {
    await markSampleFormAsReviewed(formId, adminEmail);

    await logActivity({
      userId: adminEmail,
      userEmail: adminEmail,
      userName: adminName,
      action: "UPDATE",
      entityType: "sample_form",
      entityId: formId,
      entityName: `Sample Form ${formId}`,
      description: `Marked sample form ${formId} as reviewed`,
      changesAfter: { status: "reviewed" },
    });

    revalidatePath("/admin/sample-forms");
    return { success: true };
  } catch (error) {
    console.error("markSampleFormReviewedAction error:", error);
    return { success: false, error: "Failed to mark form as reviewed." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch all (admin list)
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllSampleFormsAction(): Promise<{
  success: boolean;
  data?: SampleFormRecord[];
  error?: string;
}> {
  try {
    const q = query(collection(db, "sampleForms"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<SampleFormRecord, "id">),
    })) as SampleFormRecord[];
    return { success: true, data };
  } catch (error) {
    console.error("getAllSampleFormsAction error:", error);
    return { success: false, error: "Failed to fetch sample forms." };
  }
}
