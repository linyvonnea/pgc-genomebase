import { NextRequest, NextResponse } from "next/server";
import { ClientConforme } from "@/types/ClientConforme";

// Server-side Firebase Admin
let adminInitialized = false;
let adminDb: any = null;

async function getAdminDb() {
  if (!adminInitialized) {
    const admin = await import("firebase-admin");
    
    if (!admin.apps.length) {
      try {
        // Try to initialize with service account file first
        // Note: this may fail on Vercel if file is not present (which is expected)
        try {
          // Use require to allow failure without crashing the build analysis
          // This must be inside a try-catch that handles MODULE_NOT_FOUND
          const serviceAccount = require("../../../../scripts/serviceAccountKey.json");
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
        } catch (e) {
          // File not found, proceed to env vars
        }
      } catch (error) {
        console.error("Failed to init admin:", error);
      }
      
      // If still not initialized, try env vars
      if (!admin.apps.length) {

        // Fallback to environment variables if file doesn't exist
        if (process.env.FIREBASE_PRIVATE_KEY) {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            }),
          });
        } else {
          throw new Error("No Firebase credentials available");
        }
      }
    }
    
    adminDb = admin.firestore();
    adminInitialized = true;
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
      data: conformeDoc.data() 
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