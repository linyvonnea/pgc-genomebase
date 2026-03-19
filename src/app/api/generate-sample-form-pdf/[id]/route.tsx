import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { SampleFormPDF } from "@/components/pdf/SampleFormPDF";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = await params;

  try {
    // 1. Fetch data from Firestore via Admin SDK
    const docRef = adminDb.collection("sampleForms").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Sample form not found" }, { status: 404 });
    }

    const data = { id: docSnap.id, ...docSnap.data() } as any;

    // 2. Render PDF to Buffer
    const buffer = await renderToBuffer(<SampleFormPDF record={data} />);

    // 3. Return as PDF response
    return new NextResponse(buffer, {
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
