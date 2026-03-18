export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import admin, { getFirestoreDb } from "@/lib/firebase-admin";
import { sampleFormSchema } from "@/schemas/sampleFormSchema";

async function getAdminDb() {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error("Firebase Admin SDK not initialized");
  }
  return db;
}

function buildDocumentNumber(sequence: number): string {
  return `PGCV-LF-SSF-${String(sequence).padStart(5, "0")}`;
}

export async function POST(request: NextRequest) {
  try {
    const db = await getAdminDb();
    const body = await request.json();

    const {
      inquiryId,
      projectId,
      projectTitle,
      submittedByEmail,
      submittedByName,
      clientId,
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

    const counterRef = db.collection("counters").doc("sampleForms");
    
    let nextSequence = 1;
    let documentNumber = "";

    await db.runTransaction(async (transaction) => {
      const counterSnap = await transaction.get(counterRef);
      const currentSequence = counterSnap.exists
        ? Number(counterSnap.data()?.lastSequence || 0)
        : 0;

      nextSequence = currentSequence + 1;
      documentNumber = buildDocumentNumber(nextSequence);
      const formRef = db.collection("sampleForms").doc(documentNumber);
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
        clientId: clientId || null,
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
        id: documentNumber,
        documentNumber,
        status: "submitted",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error submitting sample form:", error);
    const detail = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to submit sample form.", detail },
      { status: 500 }
    );
  }
}
