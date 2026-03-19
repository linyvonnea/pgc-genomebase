import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { getFirestoreDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { inquiryId, data } = body;
    if (!inquiryId || !data) {
      return NextResponse.json({ error: "Missing inquiryId or data" }, { status: 400 });
    }

    const db = getFirestoreDb();
    if (!db) return NextResponse.json({ error: "admin DB not initialized" }, { status: 500 });

    await db.collection("sampleFormDrafts").doc(inquiryId).set({
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("/api/sample-forms/draft POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const inquiryId = url.searchParams.get("inquiryId");
    if (!inquiryId) return NextResponse.json({ error: "Missing inquiryId" }, { status: 400 });

    const db = getFirestoreDb();
    if (!db) return NextResponse.json({ error: "admin DB not initialized" }, { status: 500 });

    const snap = await db.collection("sampleFormDrafts").doc(inquiryId).get();
    if (!snap.exists) return NextResponse.json({ data: null });
    return NextResponse.json({ data: snap.data() });
  } catch (error) {
    console.error("/api/sample-forms/draft GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { inquiryId } = body;
    if (!inquiryId) return NextResponse.json({ error: "Missing inquiryId" }, { status: 400 });

    const db = getFirestoreDb();
    if (!db) return NextResponse.json({ error: "admin DB not initialized" }, { status: 500 });

    await db.collection("sampleFormDrafts").doc(inquiryId).delete();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("/api/sample-forms/draft DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
