/**
 * presenceService.ts
 *
 * Firestore-backed user presence system.
 * - Each user publishes their online/offline status + last-seen timestamp.
 * - A 30-second heartbeat keeps the doc fresh; stale docs (>2 min old) are
 *   treated as offline for safety.
 * - Works for both admin UIDs (keyed by email) and client sessions (keyed by
 *   "client_{inquiryId}").
 */

import { db } from "@/lib/firebase";
import {
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  collection,
  query,
  where,
  limit,
} from "firebase/firestore";

export interface UserPresence {
  isOnline: boolean;
  lastSeen: Timestamp | null;
}

const HEARTBEAT_MS = 30_000;
const STALE_THRESHOLD_MS = 2 * 60_000; // 2 minutes

/** Converts an email or arbitrary id to a safe Firestore document key */
export function toPresenceKey(id: string): string {
  return id.replace(/[.@#$/[\]]/g, "_");
}

/**
 * Start publishing presence for the given id.
 * Returns a cleanup function — call it on component unmount.
 */
export function startPresence(
  id: string,
  role: "admin" | "client" = "admin",
): () => void {
  if (typeof window === "undefined") return () => {};

  const key = toPresenceKey(id);
  const ref = doc(db, "presence", key);

  const setOnline = () =>
    setDoc(ref, { isOnline: true, lastSeen: serverTimestamp(), role }, { merge: true }).catch(
      () => {},
    );

  const setOffline = () =>
    setDoc(ref, { isOnline: false, lastSeen: serverTimestamp(), role }, { merge: true }).catch(
      () => {},
    );

  setOnline();

  const heartbeat = setInterval(setOnline, HEARTBEAT_MS);

  const onVisibility = () => {
    if (document.hidden) setOffline();
    else setOnline();
  };

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("beforeunload", setOffline);

  return () => {
    clearInterval(heartbeat);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("beforeunload", setOffline);
    setOffline();
  };
}

/** Subscribe to a single user's presence document */
export function subscribeToPresence(
  id: string,
  callback: (p: UserPresence) => void,
): () => void {
  const key = toPresenceKey(id);
  const ref = doc(db, "presence", key);

  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        callback({ isOnline: false, lastSeen: null });
        return;
      }
      const data = snap.data();
      const lastSeen: Timestamp | null = data.lastSeen ?? null;
      let isOnline = data.isOnline === true;

      // Treat as offline if the heartbeat is stale
      if (isOnline && lastSeen) {
        const ageMs = Date.now() - lastSeen.toMillis();
        if (ageMs > STALE_THRESHOLD_MS) isOnline = false;
      }

      callback({ isOnline, lastSeen });
    },
    () => callback({ isOnline: false, lastSeen: null }),
  );
}

/**
 * Subscribe to whether ANY admin is currently online.
 * Used by the client-facing chat widget to show "Support Team" status.
 */
export function subscribeToAnyAdminOnline(
  callback: (online: boolean, lastSeen: Timestamp | null) => void,
): () => void {
  const q = query(
    collection(db, "presence"),
    where("role", "==", "admin"),
    where("isOnline", "==", true),
    limit(1),
  );

  return onSnapshot(
    q,
    (snap) => {
      if (!snap.empty) {
        const data = snap.docs[0].data();
        callback(true, data.lastSeen ?? null);
      } else {
        callback(false, null);
      }
    },
    () => callback(false, null),
  );
}
