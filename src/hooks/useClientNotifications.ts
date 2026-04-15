"use client";

import { useEffect, useState, useCallback } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  writeBatch,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";

export interface ClientNotification {
  id: string;
  recipientEmail: string;
  type: "quotation" | "chargeSlip" | "serviceReport" | "message" | "general";
  title: string;
  body: string;
  read: boolean;
  createdAt: Timestamp | null;
}

export function useClientNotifications(userEmail: string | null | undefined) {
  const [notifications, setNotifications] = useState<ClientNotification[]>([]);

  useEffect(() => {
    if (!userEmail) return;

    const q = query(
      collection(db, "clientNotifications"),
      where("recipientEmail", "==", userEmail),
      orderBy("createdAt", "desc"),
      limit(30)
    );

    const unsub = onSnapshot(q, (snap) => {
      setNotifications(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as ClientNotification))
      );
    });

    return unsub;
  }, [userEmail]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = useCallback(
    async (notificationId: string) => {
      await updateDoc(doc(db, "clientNotifications", notificationId), { read: true });
    },
    []
  );

  const markAllAsRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    unread.forEach((n) => {
      batch.update(doc(db, "clientNotifications", n.id), { read: true });
    });
    await batch.commit();
  }, [notifications]);

  return { notifications, unreadCount, markAsRead, markAllAsRead };
}
