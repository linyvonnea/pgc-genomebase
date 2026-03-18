export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import admin, { adminDb } from "@/lib/firebase-admin";
import { sampleFormSchema } from "@/schemas/sampleFormSchema";

function buildDocumentNumber(sequence: number): string {
  return `PGCV-LF-SSF-${String(sequence).padStart(3, "0")}`;
}

export async function POST(request: NextRequest) {
  if (!adminDb) {
    return NextResponse.json(
      { error: "Firebase Admin SDK not initialized." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    const {
      inquiryId,
      projectId,
      projectTitle,
      submittedByEmail,
      submittedByName,
      formData,
    } = body || {};

    if (!inquiryId || !projectId || !submittedByEmail || !formData) {
      return NextResponse.json(
        { error: "Missing required payload fields." },
        { status: 400 }
      );
    }

    const validatedForm = sampleFormSchema.safeParse(formData);
    if (!validatedForm.success) {
      return NextResponse.json(
        {
          error: "Validation failed.",
          issues: validatedForm.error.issues,
        },
        { status: 400 }
      );
    }

    const counterRef = adminDb.collection("counters").doc("sampleForms");
    const formRef = adminDb.collection("sampleForms").doc();

    let nextSequence = 1;

    await adminDb.runTransaction(async (transaction) => {
      const counterSnap = await transaction.get(counterRef);
      const currentSequence = counterSnap.exists
        ? Number(counterSnap.data()?.lastSequence || 0)
        : 0;

      nextSequence = currentSequence + 1;
      const documentNumber = buildDocumentNumber(nextSequence);
      const now = admin.firestore.FieldValue.serverTimestamp();

      transaction.set(
        counterRef,
        {
          lastSequence: nextSequence,
          updatedAt: now,
        },
        { merge: true }
      );

      transaction.set(formRef, {
        ...validatedForm.data,
        inquiryId,
        projectId,
        projectTitle: projectTitle || null,
        submittedByEmail,
        submittedByName: submittedByName || null,
        formSequence: nextSequence,
        documentNumber,
        status: "submitted",
        createdAt: now,
        updatedAt: now,
        adminReceivedAt: null,
        adminReceivedBy: null,
        reviewedAt: null,
        reviewedBy: null,
      });
    });

    return NextResponse.json(
      {
        success: true,
        id: formRef.id,
        documentNumber: buildDocumentNumber(nextSequence),
        status: "submitted",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error submitting sample form:", error);
    return NextResponse.json(
      { error: "Failed to submit sample form." },
      { status: 500 }
    );
  }
}
