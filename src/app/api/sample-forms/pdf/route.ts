export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { SampleFormRecord } from "@/types/SampleForm";

async function getAdminDb() {
  if (!adminDb) {
    throw new Error("Firebase Admin SDK not initialized");
  }
  return adminDb;
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

    const { renderToBuffer } = await import("@react-pdf/renderer");
    const { SampleSubmissionFormPDF } = await import("@/components/pdf/SampleSubmissionFormPDF");
    const React = await import("react");

    console.log("Rendering PDF for form:", form.id);
    const pdfElement = React.createElement(SampleSubmissionFormPDF, { form });
    const pdfBuffer = await renderToBuffer(pdfElement as any);
    console.log("PDF Buffer generated, length:", pdfBuffer.length);

    const fileName = `${form.documentNumber || `PGCV-LF-SSF-${snapshot.id}`}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=\"${fileName}\"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("Error generating sample form PDF:", error);
    return new NextResponse(`Failed to generate PDF: ${error?.message || "Unknown error"}`, { status: 500 });
  }
}
