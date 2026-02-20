// API route to create Client Conforme with proper IP capture
import { NextRequest, NextResponse } from "next/server";
import { createClientConforme, addDirectorSignature } from "@/services/clientConformeService";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
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
      return NextResponse.json(
        { error: "Missing required fields: clientName, inquiryId, clientEmail" },
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

    // Auto-sign by program director
    await addDirectorSignature(conformeId);

    return NextResponse.json({ 
      success: true, 
      conformeId,
      message: "Client Conforme agreement recorded successfully"
    });

  } catch (error) {
    console.error("API Error creating Client Conforme:", error);
    return NextResponse.json(
      { error: "Failed to record Client Conforme agreement" },
      { status: 500 }
    );
  }
}