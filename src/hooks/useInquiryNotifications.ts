// Real-time notification hook for new inquiry requests
// Tracks inquiries with "Pending" status that need admin review

import { useState, useEffect, useRef } from "react";
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  orderBy,
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

  useEffect(() => {
    console.log("🔔 Inquiry notifications hook initializing...");
    
    // Listen to inquiries with "Pending" status
    // Remove orderBy to avoid composite index requirement - we'll sort in memory
    const inquiriesQuery = query(
      collection(db, "inquiries"),
      where("status", "==", "Pending")
    );

    const unsubscribeInquiries = onSnapshot(
      inquiriesQuery, 
      (snapshot) => {
        console.log(`🔔 Inquiry snapshot received: ${snapshot.docs.length} pending inquiries`);
        
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

        setNotifications(inquiryNotifications);
        const totalCount = inquiryNotifications.length;
        setPendingCount(totalCount);
        setUnreadCount(inquiryNotifications.filter((n) => !n.read).length);
        
        console.log(`🔔 Pending inquiry count: ${totalCount}, isInitialLoad: ${isInitialLoadRef.current}`);

        // Show toast notification for new inquiries (only after initial load)
        if (!isInitialLoadRef.current && totalCount > previousCountRef.current) {
          const latestInquiry = inquiryNotifications[0];
          console.log("🔔 New inquiry detected! Showing toast notification");
          toast.info("New Inquiry Request", {
            description: `${latestInquiry.name} from ${latestInquiry.affiliation}`,
            duration: 5000,
            action: {
              label: "View",
              onClick: () => {
                window.location.href = "/admin/inquiry";
              },
            },
          });
        }

        previousCountRef.current = totalCount;
        isInitialLoadRef.current = false;
      },
      (error) => {
        console.error("❌ Error listening to inquiry notifications:", error);
        console.error("Error details:", error.message, error.code);
      }
    );

    return () => {
      console.log("🔔 Inquiry notifications hook cleanup");
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
