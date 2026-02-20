// API route to create Client Conforme with proper IP capture
import { NextRequest, NextResponse } from "next/server";
import { createClientConforme, addDirectorSignature } from "@/services/clientConformeService";

export async function POST(request: NextRequest) {
  console.log("📋 Client Conforme API called");
  
  try {
    const body = await request.json();
    console.log("📄 Request body:", { 
      clientName: body.clientName, 
      inquiryId: body.inquiryId, 
      clientEmail: body.clientEmail 
    });
    
    const {
      documentVersion = "PGCV-LF-CC-v005",
      clientName,
      designation,
      affiliation,
      projectTitle,
      fundingAgency,
      inquiryId,
      clientEmail,
      projectPid,
      projectRequestId,
    } = body;

    // Validate required fields
    if (!clientName || !inquiryId || !clientEmail) {
      console.error("❌ Missing required fields:", { clientName: !!clientName, inquiryId: !!inquiryId, clientEmail: !!clientEmail });
      return NextResponse.json(
        { error: "Missing required information: client name, inquiry ID, or email" },
        { status: 400 }
      );
    }

    // Get client IP address
    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const cfConnectingIp = request.headers.get("cf-connecting-ip");
    
    const clientIp = forwardedFor?.split(",")[0].trim() || 
                     realIp || 
                     cfConnectingIp || 
                     "unknown";

    // Create conforme record
    console.log("💾 Creating conforme record...");
    const conformeId = await createClientConforme(
      {
        documentVersion,
        clientName: clientName.trim() || "N/A",
        designation: designation?.trim() || "N/A", 
        affiliation: affiliation?.trim() || "N/A",
        projectTitle: projectTitle?.trim() || "N/A",
        fundingAgency: fundingAgency?.trim() || "N/A",
        inquiryId,
        projectPid,
        projectRequestId,
        createdBy: clientEmail,
        clientIpAddress: clientIp,
        userAgent: request.headers.get("user-agent") || "unknown",
        status: "pending_director" as const,
      },
      clientIp,
      clientName // Client's typed name as digital signature
    );
    console.log("✅ Conforme created with ID:", conformeId);

    // Auto-sign by program director
    console.log("🖋️ Adding director signature...");
    await addDirectorSignature(conformeId);
    console.log("✅ Director signature added");

    return NextResponse.json({ 
      success: true, 
      conformeId,
      message: "Client Conforme agreement recorded successfully"
    });

  } catch (error) {
    console.error("❌ API Error creating Client Conforme:", error);
    
    // More specific error messages
    if (error instanceof Error) {
      if (error.message.includes('permission')) {
        return NextResponse.json(
          { error: "Database permission error. Please contact support." },
          { status: 403 }
        );
      } else if (error.message.includes('network') || error.message.includes('NETWORK')) {
        return NextResponse.json(
          { error: "Database connection error. Please try again." },
          { status: 503 }
        );
      }
    }
    
    return NextResponse.json(
      { error: "Failed to record Client Conforme agreement. Please try again." },
      { status: 500 }
    );
  }
}