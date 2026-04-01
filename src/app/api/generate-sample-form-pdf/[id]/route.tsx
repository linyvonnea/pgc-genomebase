import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { SampleFormPDF } from "@/components/pdf/SampleFormPDF";
import { getAdminDb } from "@/lib/firebase-admin";
import { getSampleFormById as getSampleFormByIdClient } from "@/services/sampleFormService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Prefer Admin SDK for server-side access when available
    let data: any = null;
    const db = getAdminDb();
    if (db) {
      try {
        const docRef = db.collection("sampleForms").doc(id);
        const docSnap = await docRef.get();
        if (docSnap && docSnap.exists) {
          data = { id: docSnap.id, ...docSnap.data() } as any;
        }
      } catch (err) {
        console.error("❌ PDF generation (admin read) error:", err);
        // continue to fallback
      }
    } else {
      console.warn("⚠️ Firebase Admin not initialized; falling back to client service for reading sample form.");
    }

    // Fallback: try client-side service (uses the firebase client config). This helps when Admin SDK
    // cannot be initialized in the runtime (e.g., missing service account in environment).
    if (!data) {
      try {
        const clientRecord = await getSampleFormByIdClient(id);
        if (clientRecord) data = { id: clientRecord.id, ...(clientRecord as any) };
      } catch (err) {
        console.error("❌ PDF generation (client read) error:", err);
      }
    }

    if (!data) {
      console.error("❌ PDF generation: Sample form not found or database unavailable for id:", id);
      return NextResponse.json({ error: "Sample form not found or database unavailable" }, { status: 503 });
    }

    // 2. Render PDF to Buffer
    const buffer = await renderToBuffer(<SampleFormPDF record={data} />);

    // 3. Return as PDF response
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="sample_form_${data.sfid || data.id}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("PDF generation error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
