import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";
import { adminDb } from "@/lib/firebase-admin";

type PushRole = "admin" | "client";

interface PushSubscriptionBody {
  threadId: string;
  role: PushRole;
  subscriberId: string;
  subscription: {
    endpoint: string;
    expirationTime?: number | null;
    keys?: {
      p256dh?: string;
      auth?: string;
    };
  };
}

function getSubscriptionDocId(threadId: string, role: PushRole, endpoint: string): string {
  const endpointHash = Buffer.from(endpoint).toString("base64url");
  return `${threadId}_${role}_${endpointHash}`;
}

export async function POST(req: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json({ ok: false, error: "Admin DB unavailable" }, { status: 500 });
    }
    const db = adminDb;

    const body = (await req.json()) as PushSubscriptionBody;
    const { threadId, role, subscriberId, subscription } = body;

    if (!threadId || !role || !subscriberId || !subscription?.endpoint) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    const docId = getSubscriptionDocId(threadId, role, subscription.endpoint);
    await db.collection("pushSubscriptions").doc(docId).set(
      {
        threadId,
        role,
        subscriberId,
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime ?? null,
        keys: {
          p256dh: subscription.keys?.p256dh || "",
          auth: subscription.keys?.auth || "",
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true, id: docId });
  } catch (error) {
    console.error("push subscribe failed", error);
    return NextResponse.json({ ok: false, error: "Failed to save subscription" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json({ ok: false, error: "Admin DB unavailable" }, { status: 500 });
    }
    const db = adminDb;

    const body = (await req.json()) as { threadId: string; role: PushRole; endpoint: string };
    const { threadId, role, endpoint } = body;

    if (!threadId || !role || !endpoint) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    const docId = getSubscriptionDocId(threadId, role, endpoint);
    await db.collection("pushSubscriptions").doc(docId).delete();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("push unsubscribe failed", error);
    return NextResponse.json({ ok: false, error: "Failed to delete subscription" }, { status: 500 });
  }
}
