/**
 * POST /api/chat/auto-reply
 *
 * After a client sends a chat message, the frontend calls this endpoint.
 * The route checks whether the office is currently available (Asia/Manila TZ)
 * by reading the latest office calendar settings and events from Firestore,
 * then — if the office is closed / outside hours — writes a single
 * `auto_reply` message into the threadMessages collection.
 *
 * Spam-throttle: Skip if there is already an auto_reply in this thread
 * from within the last AUTO_REPLY_COOLDOWN_MINUTES to avoid flooding.
 *
 * Security:
 *  - Validates threadId length/format before any Firestore read.
 *  - No authentication token required (the message is initiated by the client,
 *    who has already authenticated via the client portal session).
 *  - Auto-reply messages are never counted as unread and never trigger push/email.
 */

import { NextResponse } from "next/server";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  checkAvailabilityNow,
  getOfficeCalendarSettings,
  getAllOfficeEvents,
} from "@/services/officeCalendarService";

const THREADS_COLLECTION     = "quotationThreads";
const MESSAGES_COLLECTION    = "threadMessages";
const AUTO_REPLY_COOLDOWN_MIN = 60; // only one auto-reply per thread per hour

export async function POST(request: Request) {
  try {
    // ── 1. Parse and validate input ──────────────────────────────────────────
    const body = await request.json().catch(() => null);
    const threadId = typeof body?.threadId === "string" ? body.threadId.trim() : "";

    // Basic sanity guard — Firestore document IDs are 20 chars (auto-id)
    if (!threadId || threadId.length < 4 || threadId.length > 128) {
      return NextResponse.json({ error: "Invalid threadId" }, { status: 400 });
    }

    // ── 2. Confirm thread exists ─────────────────────────────────────────────
    const threadSnap = await getDoc(doc(db, THREADS_COLLECTION, threadId));
    if (!threadSnap.exists()) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // ── 3. Throttle: check for recent auto_reply in this thread ──────────────
    const cooldownMs    = AUTO_REPLY_COOLDOWN_MIN * 60 * 1000;
    const cooldownCutoff = Timestamp.fromMillis(Date.now() - cooldownMs);

    const recentQ = query(
      collection(db, MESSAGES_COLLECTION),
      where("threadId", "==", threadId),
      where("type", "==", "auto_reply"),
      where("createdAt", ">=", cooldownCutoff),
      orderBy("createdAt", "desc"),
      limit(1),
    );
    const recentSnap = await getDocs(recentQ);
    if (!recentSnap.empty) {
      // Already sent one recently — skip silently
      return NextResponse.json({ ok: true, skipped: true });
    }

    // ── 4. Determine current availability ───────────────────────────────────
    const [settings, allEvents] = await Promise.all([
      getOfficeCalendarSettings(),
      getAllOfficeEvents(),
    ]);

    const availability = checkAvailabilityNow(allEvents, settings);

    // If the office is fully open with no special condition, no reply needed
    if (availability.reason === "open") {
      return NextResponse.json({ ok: true, open: true });
    }

    // ── 5. Write auto-reply message to Firestore ─────────────────────────────
    // Note: we write directly (not via addThreadMessage) to avoid:
    //   - incrementing unreadCount (the client will see it immediately)
    //   - triggering push/email notifications
    //   - incrementing adminTextMessageCount
    await addDoc(collection(db, MESSAGES_COLLECTION), {
      threadId,
      type: "auto_reply",
      reason: availability.reason,
      content: availability.autoReplyMessage,
      senderId: "system",
      senderName: "PGC Support",
      senderRole: "admin",
      isRead: false,
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({ ok: true, reason: availability.reason });
  } catch (error) {
    console.error("auto-reply route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
