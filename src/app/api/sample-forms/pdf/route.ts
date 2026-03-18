export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { SampleFormRecord } from "@/types/SampleForm";

export async function GET(request: NextRequest) {
  if (!adminDb) {
    return new NextResponse("Firebase Admin SDK not initialized", { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return new NextResponse("Sample form id is required", { status: 400 });
    }

    const docRef = adminDb.collection("sampleForms").doc(id);
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

    const pdfElement = React.createElement(SampleSubmissionFormPDF, { form });
    const pdfBuffer = await renderToBuffer(pdfElement as any);

    const fileName = `${form.documentNumber || `PGCV-LF-SSF-${snapshot.id}`}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=\"${fileName}\"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Error generating sample form PDF:", error);
    return new NextResponse("Failed to generate PDF", { status: 500 });
  }
}
