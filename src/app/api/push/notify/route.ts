import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getWebPushClient } from "@/lib/webPush";

type MessageSenderRole = "admin" | "client";

interface NotifyBody {
  threadId: string;
  senderRole: MessageSenderRole;
  messagePreview: string;
  unreadCount?: number;
}

export async function POST(req: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json({ ok: false, error: "Admin DB unavailable" }, { status: 500 });
    }
    const db = adminDb;

    const body = (await req.json()) as NotifyBody;
    const { threadId, senderRole, messagePreview, unreadCount } = body;

    if (!threadId || !senderRole) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    const targetRole = senderRole === "admin" ? "client" : "admin";
    const subscriptionsSnap = await db
      .collection("pushSubscriptions")
      .where("threadId", "==", threadId)
      .where("role", "==", targetRole)
      .get();

    if (subscriptionsSnap.empty) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    const webpush = getWebPushClient();

    const payload = JSON.stringify({
      title: senderRole === "admin" ? "New message from PGC Visayas" : "New client message",
      body: messagePreview || "You have a new chat update.",
      tag: `thread-${threadId}`,
      threadId,
      unreadCount: unreadCount ?? 0,
      url: "/client/client-info",
      icon: "/assets/pgc-logo.png",
      badge: "/assets/pgc-logo.png",
    });

    let sent = 0;
    await Promise.all(
      subscriptionsSnap.docs.map(async (docSnap) => {
        const sub = docSnap.data();
        const subscription = {
          endpoint: sub.endpoint,
          expirationTime: sub.expirationTime ?? null,
          keys: {
            p256dh: sub.keys?.p256dh,
            auth: sub.keys?.auth,
          },
        };

        try {
          await webpush.sendNotification(subscription as any, payload);
          sent += 1;
        } catch (error: any) {
          const statusCode = error?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await db.collection("pushSubscriptions").doc(docSnap.id).delete();
          }
          console.error("push send failed", docSnap.id, error?.message || error);
        }
      })
    );

    return NextResponse.json({ ok: true, sent });
  } catch (error) {
    console.error("push notify failed", error);
    return NextResponse.json({ ok: false, error: "Failed to send push" }, { status: 500 });
  }
}
