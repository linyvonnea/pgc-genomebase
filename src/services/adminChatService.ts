/**
 * Admin Chat Service
 *
 * Manages direct-message (DM) channels between admin users.
 *
 * Firestore collections:
 *   adminChannels/{channelId}  — channel metadata
 *   adminMessages/{messageId} — individual messages
 *
 * Best practices applied:
 *  - Deterministic channel IDs avoid duplicate documents for the same pair.
 *  - Email addresses are sanitised before use as Firestore map keys to avoid
 *    collision with Firestore's dot-path separator.
 *  - Unread counts are incremented transactionally via runTransaction to
 *    prevent race conditions when admins message concurrently.
 *  - markAdminMessagesRead() uses a batched write capped at 500 ops (Firestore
 *    batch limit) for safety.
 *  - No secret keys or PII leak to client beyond what the authenticated user
 *    already owns.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  addDoc,
  writeBatch,
  arrayUnion,
  runTransaction,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AdminChannel, AdminMessage } from "@/types/AdminChat";

const CHANNELS_COLLECTION = "adminChannels";
const MESSAGES_COLLECTION = "adminMessages";

// ---------------------------------------------------------------------------
// Key helpers
// ---------------------------------------------------------------------------

/**
 * Sanitise an email address so it is safe to use as a Firestore map key.
 * Replaces `.` (Firestore path separator) and `@` with underscores.
 *
 * Examples:
 *   "admin@up.edu.ph"  → "admin_up_edu_ph"
 */
export function emailToKey(email: string): string {
  return email.replace(/[@.]/g, "_");
}

/**
 * Derive a deterministic, collision-resistant channel ID from two admin emails.
 * Emails are sorted so the same pair always produces the same ID regardless of
 * which user initiates the conversation.
 */
function getDMChannelId(emailA: string, emailB: string): string {
  const sorted = [emailA, emailB].sort();
  // base64 of "emailA|||emailB", stripped of padding / special chars
  const raw = Buffer.from(sorted.join("|||")).toString("base64");
  return raw.replace(/[/+=]/g, "").substring(0, 40);
}

// ---------------------------------------------------------------------------
// Channel management
// ---------------------------------------------------------------------------

/**
 * Return the channel ID for a DM between two admins, creating the channel
 * document if it does not yet exist.
 */
export async function getOrCreateDMChannel(
  emailA: string,
  nameA: string,
  emailB: string,
  nameB: string,
): Promise<string> {
  const channelId = getDMChannelId(emailA, emailB);
  const ref = doc(db, CHANNELS_COLLECTION, channelId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const keyA = emailToKey(emailA);
    const keyB = emailToKey(emailB);

    await setDoc(ref, {
      participants: [emailA, emailB].sort(),
      participantNames: {
        [keyA]: nameA,
        [keyB]: nameB,
      },
      unreadCounts: {
        [keyA]: 0,
        [keyB]: 0,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    // Keep display names fresh in case an admin changed their name
    const keyA = emailToKey(emailA);
    const keyB = emailToKey(emailB);
    const existing = snap.data();
    const names: Record<string, string> = existing?.participantNames || {};
    if (names[keyA] !== nameA || names[keyB] !== nameB) {
      await updateDoc(ref, {
        [`participantNames.${keyA}`]: nameA,
        [`participantNames.${keyB}`]: nameB,
      });
    }
  }

  return channelId;
}

// ---------------------------------------------------------------------------
// Real-time subscriptions
// ---------------------------------------------------------------------------

/**
 * Subscribe to all DM channels that include `adminEmail` as a participant.
 * Results are sorted client-side by most recent activity so no composite
 * Firestore index is required.
 */
export function subscribeToAdminChannels(
  adminEmail: string,
  callback: (channels: AdminChannel[]) => void,
): () => void {
  const q = query(
    collection(db, CHANNELS_COLLECTION),
    where("participants", "array-contains", adminEmail),
  );

  return onSnapshot(q, (snap) => {
    const channels = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as AdminChannel))
      .sort((a, b) => {
        const tA = a.lastMessageAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0;
        const tB = b.lastMessageAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0;
        return tB - tA;
      });
    callback(channels);
  });
}

/**
 * Subscribe to all messages belonging to `channelId`, sorted by creation time.
 */
export function subscribeToAdminMessages(
  channelId: string,
  callback: (messages: AdminMessage[]) => void,
): () => void {
  const q = query(
    collection(db, MESSAGES_COLLECTION),
    where("channelId", "==", channelId),
  );

  return onSnapshot(q, (snap) => {
    const messages = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as AdminMessage))
      .sort((a, b) => {
        const tA = a.createdAt?.toMillis?.() ?? 0;
        const tB = b.createdAt?.toMillis?.() ?? 0;
        return tA - tB;
      });
    callback(messages);
  });
}

// ---------------------------------------------------------------------------
// Messaging
// ---------------------------------------------------------------------------

/**
 * Send a plain-text message to `channelId` and increment unread counts for
 * the other participants using a Firestore transaction to avoid races.
 */
export async function sendAdminMessage(
  channelId: string,
  senderId: string,
  senderName: string,
  content: string,
): Promise<void> {
  // 1. Add the message document (outside the transaction — addDoc is fine here
  //    because the read-modify-write race is on the *channel* document, not
  //    the new message document).
  await addDoc(collection(db, MESSAGES_COLLECTION), {
    channelId,
    senderId,
    senderName,
    content: content.trim(),
    createdAt: serverTimestamp(),
    readBy: [senderId], // sender has already "read" their own message
  });

  // 2. Atomically increment unread counts for other participants
  const channelRef = doc(db, CHANNELS_COLLECTION, channelId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(channelRef);
    if (!snap.exists()) return;

    const data = snap.data() as AdminChannel;
    const participants: string[] = data.participants || [];
    const update: Record<string, unknown> = {
      lastMessageAt: serverTimestamp(),
      lastMessageBy: senderId,
      lastMessagePreview: content.trim().substring(0, 120),
      updatedAt: serverTimestamp(),
    };

    participants.forEach((email) => {
      if (email !== senderId) {
        const key = emailToKey(email);
        update[`unreadCounts.${key}`] = (data.unreadCounts?.[key] ?? 0) + 1;
      }
    });

    tx.update(channelRef, update);
  });
}

// ---------------------------------------------------------------------------
// Read receipts
// ---------------------------------------------------------------------------

/**
 * Mark all messages in `channelId` as read for `adminEmail` and reset their
 * unread counter on the channel document.
 * Uses batched writes (500-op Firestore limit respected).
 */
export async function markAdminMessagesRead(
  channelId: string,
  adminEmail: string,
): Promise<void> {
  // Reset unread count for this admin immediately
  const channelRef = doc(db, CHANNELS_COLLECTION, channelId);
  await updateDoc(channelRef, {
    [`unreadCounts.${emailToKey(adminEmail)}`]: 0,
  });

  // Mark individual messages
  const snap = await getDocs(
    query(
      collection(db, MESSAGES_COLLECTION),
      where("channelId", "==", channelId),
    ),
  );

  const BATCH_SIZE = 490; // keep well under the 500-op limit
  const unread = snap.docs.filter(
    (d) => !(d.data().readBy as string[])?.includes(adminEmail),
  );

  for (let i = 0; i < unread.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    unread.slice(i, i + BATCH_SIZE).forEach((d) => {
      batch.update(d.ref, { readBy: arrayUnion(adminEmail) });
    });
    await batch.commit();
  }
}
