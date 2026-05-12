// API Route: POST /api/portal/change-password
// Allows a client to set or update a custom portal password.
// The custom password is stored as `customPassword` on their inquiry document.
// Validation: alphanumeric only, 6–40 characters.

import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const PASSWORD_REGEX = /^[a-zA-Z0-9]{6,40}$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const googleEmail: string = (body?.googleEmail || "").trim().toLowerCase();
    const inquiryId: string = (body?.inquiryId || "").trim();
    const currentPassword: string = (body?.currentPassword || "").trim();
    const newPassword: string = (body?.newPassword || "").trim();

    // Basic input validation
    if (!googleEmail || !inquiryId || !currentPassword || !newPassword) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }

    if (!PASSWORD_REGEX.test(newPassword)) {
      return NextResponse.json(
        { error: "New password must be 6–40 alphanumeric characters (letters and numbers only)." },
        { status: 400 }
      );
    }

    // Fetch the inquiry document
    const inquiryRef = doc(db, "inquiries", inquiryId);
    const inquirySnap = await getDoc(inquiryRef);

    if (!inquirySnap.exists()) {
      return NextResponse.json({ error: "Inquiry not found." }, { status: 404 });
    }

    const data = inquirySnap.data();

    // Verify the Google email matches the inquiry owner
    const inquiryEmail: string = (data.email || "").toLowerCase();
    if (inquiryEmail !== googleEmail) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    // Verify the current password:
    // If a customPassword is already set, check against it; otherwise check against the inquiry ID.
    const storedPassword: string = data.customPassword || inquiryId;
    if (currentPassword !== storedPassword) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }

    // Prevent setting the same password
    if (newPassword === storedPassword) {
      return NextResponse.json(
        { error: "New password must be different from the current password." },
        { status: 400 }
      );
    }

    // Update the customPassword field on the inquiry document
    await updateDoc(inquiryRef, { customPassword: newPassword });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("change-password route error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
