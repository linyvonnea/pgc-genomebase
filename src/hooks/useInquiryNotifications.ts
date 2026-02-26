// Real-time notification hook for new inquiry requests
// Tracks inquiries with "Pending" status that need admin review
// Pattern follows useApprovalNotifications.ts

import { useState, useEffect, useRef } from "react";
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";

export interface InquiryNotification {
  id: string;
  name: string;
  email: string;
  affiliation: string;
  serviceType: string;
  createdAt: Date;
  read?: boolean;
}

export function useInquiryNotifications() {
  const [notifications, setNotifications] = useState<InquiryNotification[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const previousCountRef = useRef(0);
  const isInitialLoadRef = useRef(true);
  const toastIdsRef = useRef<Record<string, string | number>>({});

  useEffect(() => {
    // Listen to inquiries with "Pending" status (capital P to match createInquiryAction)
    const inquiriesQuery = query(
      collection(db, "inquiries"),
      where("status", "==", "Pending")
    );

    const unsubscribeInquiries = onSnapshot(
      inquiriesQuery, 
      (snapshot) => {
        const inquiryNotifications: InquiryNotification[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || "Unknown",
            email: data.email || "",
            affiliation: data.affiliation || "",
            serviceType: data.serviceType || "general",
            createdAt: data.createdAt?.toDate() || new Date(),
            read: false,
          };
        });
        
        // Sort in memory by createdAt descending
        inquiryNotifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        const totalCount = inquiryNotifications.length;
        
        // Use persistent toasts for pending inquiries
        const currentIds = new Set(inquiryNotifications.map(n => n.id));

        // 1. Dismiss toasts for inquiries no longer "Pending"
        Object.keys(toastIdsRef.current).forEach(id => {
          if (!currentIds.has(id)) {
            toast.dismiss(toastIdsRef.current[id]);
            delete toastIdsRef.current[id];
          }
        });

        // 2. Show toasts for each pending inquiry
        inquiryNotifications.forEach(n => {
          if (!toastIdsRef.current[n.id]) {
            const tId = toast.info("Pending Inquiry", {
              description: `${n.name} from ${n.affiliation}`,
              duration: Infinity,
              action: {
                label: "View",
                onClick: () => {
                  window.location.href = `/admin/inquiry/${n.id}`;
                },
              },
            });
            toastIdsRef.current[n.id] = tId;
          }
        });

        previousCountRef.current = totalCount;
        isInitialLoadRef.current = false;
        
        setNotifications(inquiryNotifications);
        setPendingCount(totalCount);
        setUnreadCount(inquiryNotifications.filter((n) => !n.read).length);
      },
      (error) => {
        console.error("Error listening to inquiry notifications:", error);
      }
    );

    return () => {
      // Clean up toasts on unmount to avoid persistent UI after leaving the admin area
      Object.values(toastIdsRef.current).forEach(id => toast.dismiss(id));
      unsubscribeInquiries();
    };
  }, []);

  const markAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return {
    notifications,
    pendingCount,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
}
