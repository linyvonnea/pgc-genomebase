// API Route: POST /api/portal/change-password
// Allows a client to update their portal password.
// The active password source of truth is stored as `customPassword` on the primary
// (oldest) inquiry. If no customPassword exists yet, the primary inquiry ID is the password.

import { NextRequest, NextResponse } from "next/server";
import { collection, getDocs, query, where, doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,40}$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const googleEmail: string = (body?.googleEmail || "").trim().toLowerCase();
    const currentPassword: string = (body?.currentPassword || "").trim();
    const newPassword: string = (body?.newPassword || "").trim();

    if (!googleEmail || !currentPassword || !newPassword) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }

    if (!PASSWORD_REGEX.test(newPassword)) {
      return NextResponse.json(
        { error: "New password must be 8–40 characters and include at least one uppercase letter, one number, and one special character." },
        { status: 400 }
      );
    }

    // Find all inquiries for this email
    const snap = await getDocs(
      query(collection(db, "inquiries"), where("email", "==", googleEmail))
    );

    if (snap.empty) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    // Sort ascending by createdAt — the oldest inquiry is the primary auth source
    const sorted = [...snap.docs].sort((a, b) => {
      const tsA = a.data().createdAt;
      const tsB = b.data().createdAt;
      const msA = tsA instanceof Timestamp ? tsA.toMillis() : (tsA ? Number(tsA) : 0);
      const msB = tsB instanceof Timestamp ? tsB.toMillis() : (tsB ? Number(tsB) : 0);
      return msA - msB;
    });

    // The inquiry that holds the customPassword (if any) is the auth source of truth.
    // Fall back to the primary (oldest) inquiry if no customPassword has been set.
    const withCustomPw = snap.docs.find((d) => !!d.data().customPassword);
    const primaryDoc = withCustomPw ?? sorted[0];
    const primaryData = primaryDoc.data();

    // Verify current password
    const storedPassword: string = primaryData.customPassword || primaryDoc.id;
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

    // Write customPassword to the primary inquiry only
    await updateDoc(doc(db, "inquiries", primaryDoc.id), { customPassword: newPassword });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("change-password route error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
