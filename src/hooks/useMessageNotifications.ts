/**
 * useMessageNotifications
 *
 * Real-time hook that listens to quotationThreads with unread admin messages.
 * Powers the in-header Message Notification Center.
 */

import { useState, useEffect, useRef } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { QuotationThread } from "@/types/QuotationThread";

export interface MessageNotification {
  inquiryId: string;
  clientName: string;
  clientEmail: string;
  clientAffiliation: string;
  unreadCount: number;
  lastMessageAt?: Date;
  lastMessageBy?: string;
  /** Local-only flag — true after the admin opens this thread from the panel */
  viewed: boolean;
}

export function useMessageNotifications() {
  const [notifications, setNotifications] = useState<MessageNotification[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  // Track which inquiry IDs have been "viewed" in the panel (local-only)
  const viewedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const q = query(
      collection(db, "quotationThreads"),
      where("unreadCount.admin", ">", 0)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const threads: MessageNotification[] = snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data() as QuotationThread;
          return {
            inquiryId: docSnap.id,
            clientName: data.clientName || "Unknown",
            clientEmail: data.clientEmail || "",
            clientAffiliation: data.clientAffiliation || "",
            unreadCount: data.unreadCount?.admin ?? 0,
            lastMessageAt: data.lastMessageAt?.toDate?.(),
            lastMessageBy: data.lastMessageBy,
            viewed: viewedRef.current.has(docSnap.id),
          };
        })
        .sort((a, b) => {
          const tA = a.lastMessageAt?.getTime() ?? 0;
          const tB = b.lastMessageAt?.getTime() ?? 0;
          return tB - tA; // newest first
        });

      const total = threads.reduce((sum, t) => sum + t.unreadCount, 0);
      setTotalUnread(total);
      setNotifications(threads);
    });

    return () => unsubscribe();
  }, []);

  /** Mark a single thread as viewed in the panel (visual only — clears the blue dot) */
  const markViewed = (inquiryId: string) => {
    viewedRef.current.add(inquiryId);
    setNotifications((prev) =>
      prev.map((n) => (n.inquiryId === inquiryId ? { ...n, viewed: true } : n))
    );
  };

  /** Mark all threads viewed in the panel */
  const markAllViewed = () => {
    setNotifications((prev) => {
      prev.forEach((n) => viewedRef.current.add(n.inquiryId));
      return prev.map((n) => ({ ...n, viewed: true }));
    });
  };

  return { notifications, totalUnread, markViewed, markAllViewed };
}
