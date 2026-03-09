import { NextRequest, NextResponse } from "next/server";
import { ClientConforme } from "@/types/ClientConforme";
import { adminDb } from "@/lib/firebase-admin";

async function getAdminDb() {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized. Check FIREBASE_SERVICE_ACCOUNT env var.");
  }
  return adminDb;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conformeId = searchParams.get("id");

    if (!conformeId) {
      return new NextResponse("Conforme ID is required", { status: 400 });
    }

    // Get the conforme data from Firestore using Admin SDK
    const db = await getAdminDb();
    const conformeDoc = await db.collection("clientConformes").doc(conformeId).get();
    
    if (!conformeDoc.exists) {
      return new NextResponse("Conforme not found", { status: 404 });
    }

    const conformeData: ClientConforme = { 
      id: conformeDoc.id, 
      data: conformeDoc.data() as ClientConforme["data"]
    };

    // Import PDF libraries server-side with proper error handling
    const { renderToBuffer } = await import("@react-pdf/renderer");
    const { ClientConformePDF } = await import("@/components/pdf/ClientConformePDF");
    const React = await import("react");

    // Generate PDF buffer - ClientConformePDF returns a Document component
    const pdfElement = React.createElement(ClientConformePDF, { conforme: conformeData });
    const pdfBuffer = await renderToBuffer(pdfElement as any);

    // Return PDF with proper headers
    const fileName = `Client_Conforme_${conformeData.data.clientName?.replace(/\s+/g, '_') || 'Unknown'}_${conformeData.data.inquiryId || 'Unknown'}.pdf`;
    
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-cache",
      },
    });

  } catch (error) {
    console.error("Error generating PDF:", error);
    return new NextResponse(`Error generating PDF: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 });
  }
}