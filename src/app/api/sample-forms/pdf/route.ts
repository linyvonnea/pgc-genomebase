export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getFirestoreDb, getStorageBucket } from "@/lib/firebase-admin";
import { SampleFormRecord } from "@/types/SampleForm";

async function getAdminDb() {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error("Firebase Admin SDK not initialized");
  }
  return db;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return new NextResponse("Sample form id is required", { status: 400 });
    }

    const db = await getAdminDb();
    const docRef = db.collection("sampleForms").doc(id);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      return new NextResponse("Sample form not found", { status: 404 });
    }

    const data = snapshot.data() as Omit<SampleFormRecord, "id">;
    const form: SampleFormRecord = {
      ...data,
      id: snapshot.id,
    };

    const fileName = `${form.documentNumber || `PGCV-LF-SSF-${snapshot.id}`}.pdf`;

    if (form.pdfStoragePath) {
      try {
        const bucket = getStorageBucket();
        if (bucket) {
          const file = bucket.file(form.pdfStoragePath);
          const [exists] = await file.exists();

          if (exists) {
            const [storedBuffer] = await file.download();
            return new NextResponse(new Uint8Array(storedBuffer), {
              status: 200,
              headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename=\"${fileName}\"`,
                "Cache-Control": "public, max-age=31536000, immutable",
                "X-PDF-Source": "firebase-storage-snapshot",
              },
            });
          }
        }
      } catch (storageError) {
        console.error("Error downloading immutable sample form PDF snapshot:", storageError);
      }
    }

    const { renderToBuffer } = await import("@react-pdf/renderer");
    const { SampleSubmissionFormPDF } = await import("@/components/pdf/SampleSubmissionFormPDF");
    const React = await import("react");

    console.log("Rendering PDF for form:", form.id);
    const pdfElement = React.createElement(SampleSubmissionFormPDF, { form });
    const pdfBuffer = await renderToBuffer(pdfElement as any);
    console.log("PDF Buffer generated, length:", pdfBuffer.length);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=\"${fileName}\"`,
        "Cache-Control": "no-cache",
        "X-PDF-Source": "dynamic-render-fallback",
      },
    });
  } catch (error: any) {
    console.error("Error generating sample form PDF:", error);
    return new NextResponse(`Failed to generate PDF: ${error?.message || "Unknown error"}`, { status: 500 });
  }
}
