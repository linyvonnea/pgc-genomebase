/**
 * POST /api/chat/auto-reply
 *
 * After a client sends a chat message, the frontend calls this endpoint.
 * The route checks whether the office is currently available (Asia/Manila TZ)
 * by reading the latest office calendar settings and events from Firestore,
 * then — if the office is closed / outside hours — writes a single
 * `auto_reply` message into the threadMessages collection.
 *
 * Spam-throttle: the `lastAutoReplyAt` timestamp is stored directly on the
 * thread document so we can check it with the single `getDoc` that already
 * happens in step 2 — no composite Firestore index needed.
 *
 * Security:
 *  - Validates threadId length/format before any Firestore read.
 *  - No authentication token required (the message is initiated by the client,
 *    who has already authenticated via the client portal session).
 *  - Auto-reply messages never increment unreadCount and never trigger push/email.
 */

import { NextResponse } from "next/server";
import {
  collection,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  checkAvailabilityNow,
  getOfficeCalendarSettings,
  getAllOfficeEvents,
} from "@/services/officeCalendarService";

const THREADS_COLLECTION      = "quotationThreads";
const MESSAGES_COLLECTION     = "threadMessages";
const AUTO_REPLY_COOLDOWN_MIN = 60; // one auto-reply per thread per hour maximum

export async function POST(request: Request) {
  try {
    // ── 1. Parse and validate input ──────────────────────────────────────────
    const body = await request.json().catch(() => null);
    const threadId = typeof body?.threadId === "string" ? body.threadId.trim() : "";

    if (!threadId || threadId.length < 4 || threadId.length > 128) {
      return NextResponse.json({ error: "Invalid threadId" }, { status: 400 });
    }

    // ── 2. Fetch thread — also used for throttle check ───────────────────────
    const threadRef  = doc(db, THREADS_COLLECTION, threadId);
    const threadSnap = await getDoc(threadRef);

    if (!threadSnap.exists()) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // ── 3. Throttle: read lastAutoReplyAt stored on the thread document ───────
    // This avoids a compound Firestore query that would need a composite index.
    const threadData = threadSnap.data() as Record<string, any>;
    const lastAutoReplyAt: Timestamp | undefined = threadData.lastAutoReplyAt;

    if (lastAutoReplyAt) {
      const cooldownMs  = AUTO_REPLY_COOLDOWN_MIN * 60 * 1000;
      const lastReplyMs = typeof lastAutoReplyAt.toMillis === "function"
        ? lastAutoReplyAt.toMillis()
        : 0;
      if (Date.now() - lastReplyMs < cooldownMs) {
        return NextResponse.json({ ok: true, skipped: true });
      }
    }

    // ── 4. Determine current availability ────────────────────────────────────
    const [settings, allEvents] = await Promise.all([
      getOfficeCalendarSettings(),
      getAllOfficeEvents(),
    ]);

    const availability = checkAvailabilityNow(allEvents, settings);

    // If fully open with no special condition, no reply needed
    if (availability.reason === "open") {
      return NextResponse.json({ ok: true, open: true });
    }

    // ── 5. Write auto-reply message + stamp the thread atomically ─────────────
    // Both writes are independent; if the message write succeeds but the thread
    // stamp fails, the worst case is an extra message within the cooldown window,
    // which is acceptable. We do NOT use a Firestore transaction here to keep
    // the server-side latency low.
    await Promise.all([
      addDoc(collection(db, MESSAGES_COLLECTION), {
        threadId,
        type: "auto_reply",
        reason: availability.reason,
        content: availability.autoReplyMessage,
        senderId: "system",
        senderName: "PGC Support",
        senderRole: "admin",
        isRead: false,
        createdAt: serverTimestamp(),
      }),
      updateDoc(threadRef, {
        lastAutoReplyAt: serverTimestamp(),
      }),
    ]);

    return NextResponse.json({ ok: true, reason: availability.reason });
  } catch (error) {
    console.error("auto-reply route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

