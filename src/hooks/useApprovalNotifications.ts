// Real-time notification hook for approval requests
// Tracks both traditional member approvals AND new project submission requests

import { useState, useEffect, useRef } from "react";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  limit,
  Timestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";

export interface ApprovalNotification {
  id: string;
  type: "member" | "project";
  title: string;
  message: string;
  submittedBy: string;
  submittedByName?: string;
  submittedAt: Date;
  inquiryId: string;
  read?: boolean;
}

export function useApprovalNotifications() {
  const [notifications, setNotifications] = useState<ApprovalNotification[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const previousCountRef = useRef(0);
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    // Listen to traditional member approvals
    const memberApprovalsQuery = query(
      collection(db, "memberApprovals"),
      where("status", "==", "pending")
    );

    // Listen to project requests
    const projectRequestsQuery = query(
      collection(db, "projectRequests"),
      where("status", "==", "pending")
    );

    const unsubscribeMemberApprovals = onSnapshot(
      memberApprovalsQuery, 
      (snapshot) => {
        const memberNotifications: ApprovalNotification[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            type: "member" as const,
            title: `Team Member Submission`,
            message: `New team members for ${data.projectTitle || "project"}`,
            submittedBy: data.submittedBy,
            submittedByName: data.submittedByName,
            submittedAt: data.submittedAt?.toDate() || new Date(),
            inquiryId: data.inquiryId,
            read: false,
          };
        });

        updateNotifications(memberNotifications, "member");
      },
      (error) => {
        console.error("Error listening to member approvals:", error);
      }
    );

    const unsubscribeProjectRequests = onSnapshot(
      projectRequestsQuery, 
      (snapshot) => {
        const projectNotifications: ApprovalNotification[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            type: "project" as const,
            title: `New Project Submission`,
            message: `${data.title || "Untitled Project"} submitted for approval`,
            submittedBy: data.requestedBy,
            submittedByName: data.requestedByName,
            submittedAt: data.submittedAt?.toDate() || new Date(),
            inquiryId: data.inquiryId,
            read: false,
          };
        });

        updateNotifications(projectNotifications, "project");
      },
      (error) => {
        console.error("Error listening to project requests:", error);
      }
    );

    return () => {
      unsubscribeMemberApprovals();
      unsubscribeProjectRequests();
    };
  }, []);

  const updateNotifications = (newNotifications: ApprovalNotification[], type: "member" | "project") => {
    setNotifications((prev) => {
      // Filter out old notifications of the same type
      const otherTypeNotifications = prev.filter((n) => n.type !== type);
      
      // Combine and sort, limit to top 20
      const combined = [...otherTypeNotifications, ...newNotifications]
        .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
        .slice(0, 20);

      const totalCount = combined.length;
      setPendingCount(totalCount);
      setUnreadCount(combined.filter((n) => !n.read).length);

      // Show toast notification for new submissions (only after initial load)
      if (!isInitialLoadRef.current && totalCount > previousCountRef.current) {
        const latestNotification = combined[0];
        toast.info(latestNotification.title, {
          description: latestNotification.message,
          duration: 5000,
          action: {
            label: "View",
            onClick: () => {
              window.location.href = "/admin/member-approvals";
            },
          },
        });
      }

      previousCountRef.current = totalCount;
      isInitialLoadRef.current = false;

      return combined;
    });
  };

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
