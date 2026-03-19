export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import admin, { getFirestoreDb, getStorageBucket } from "@/lib/firebase-admin";
import { sampleFormSchema } from "@/schemas/sampleFormSchema";
import { SampleFormRecord } from "@/types/SampleForm";

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

async function createImmutablePdfSnapshot(form: SampleFormRecord) {
  const { renderToBuffer } = await import("@react-pdf/renderer");
  const { SampleSubmissionFormPDF } = await import("@/components/pdf/SampleSubmissionFormPDF");
  const React = await import("react");

  const pdfElement = React.createElement(SampleSubmissionFormPDF, { form });
  return renderToBuffer(pdfElement as any);
}

async function uploadImmutablePdf(documentNumber: string, pdfBuffer: Buffer) {
  const bucket = getStorageBucket();
  if (!bucket) {
    throw new Error("Firebase Storage bucket not configured");
  }

  const storagePath = `sample-forms/${documentNumber}/v1/${documentNumber}.pdf`;
  const file = bucket.file(storagePath);

  await file.save(pdfBuffer, {
    resumable: false,
    contentType: "application/pdf",
    metadata: {
      cacheControl: "public, max-age=31536000, immutable",
      contentType: "application/pdf",
      metadata: {
        documentNumber,
        entityType: "sample-form",
        version: "1",
      },
    },
  });

  const [signedUrl] = await file.getSignedUrl({
    action: "read",
    expires: "2100-01-01",
  });

  return {
    storagePath,
    signedUrl,
  };
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

    let pdfStoragePath: string | null = null;
    let pdfDownloadUrl: string | null = null;

    try {
      const snapshotRecord: SampleFormRecord = {
        ...validatedForm.data,
        id: documentNumber,
        inquiryId,
        projectId,
        projectTitle: projectTitle || undefined,
        submittedByEmail,
        submittedByName: submittedByName || undefined,
        clientId: clientId || undefined,
        formSequence: nextSequence,
        documentNumber,
        status: "submitted",
      };

      const pdfBuffer = await createImmutablePdfSnapshot(snapshotRecord);
      const uploaded = await uploadImmutablePdf(documentNumber, pdfBuffer as Buffer);
      pdfStoragePath = uploaded.storagePath;
      pdfDownloadUrl = uploaded.signedUrl;

      await db.collection("sampleForms").doc(documentNumber).set(
        {
          pdfStoragePath,
          pdfDownloadUrl,
          pdfVersion: 1,
          pdfGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } catch (pdfError) {
      console.error("Error creating immutable sample form PDF snapshot:", pdfError);
      await db.collection("sampleForms").doc(documentNumber).set(
        {
          pdfGenerationError:
            pdfError instanceof Error ? pdfError.message : "Unknown PDF generation error",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    return NextResponse.json(
      {
        success: true,
        id: documentNumber,
        documentNumber,
        pdfStoragePath,
        pdfDownloadUrl,
        pdfUrl: `/client/view-document?type=sample-form&ref=${encodeURIComponent(documentNumber)}`,
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
