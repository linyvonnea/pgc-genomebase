// Real-time notification hook for approval requests
// Tracks member approvals, project submission requests, AND new inquiries

import { useState, useEffect, useRef } from "react";
import { 
  collection,
  collectionGroup,
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
  type: "member" | "project" | "inquiry";
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
  const [inquiryCount, setInquiryCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingChargeSlipCount, setPendingChargeSlipCount] = useState(0);
  const [projectUploadCount, setProjectUploadCount] = useState(0);
  const [newOrCount, setNewOrCount] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    try { return parseInt(localStorage.getItem('pgc_or_count') ?? '0', 10) || 0; }
    catch { return 0; }
  });
  const [newOrChargeSlipNumbers, setNewOrChargeSlipNumbers] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const v = localStorage.getItem('pgc_or_cs_nums');
      return v ? new Set(JSON.parse(v)) : new Set();
    } catch { return new Set(); }
  });
  const previousCountRef = useRef(0);
  const previousInquiryCountRef = useRef(0);
  const isInitialLoadRef = useRef(true);
  const isInitialInquiryLoadRef = useRef(true);
  const isInitialOrLoadRef = useRef(true);
  const inquiryToastIdsRef = useRef<Record<string, string | number>>({});
  const orToastIdsRef = useRef<Record<string, string | number>>();

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
    
    // Listen to new inquiries with "Pending" status
    const inquiriesQuery = query(
      collection(db, "inquiries"),
      where("status", "==", "Pending")
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
    
    const unsubscribeInquiries = onSnapshot(
      inquiriesQuery, 
      (snapshot) => {
        // Get all pending inquiries (removed 24h filter as requested)
        const pendingInquiries = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as any));

        const count = pendingInquiries.length;
        setInquiryCount(count);
        
        // Show persistent toasts for each pending inquiry
        // Track current IDs in the snapshot
        const currentInquiryIds = new Set(pendingInquiries.map(iq => iq.id));

        // 1. Dismiss toasts for inquiries no longer in "Pending" status
        Object.keys(inquiryToastIdsRef.current).forEach(id => {
          if (!currentInquiryIds.has(id)) {
            toast.dismiss(inquiryToastIdsRef.current[id]);
            delete inquiryToastIdsRef.current[id];
          }
        });

        // 2. Show toasts for new inquiries (only AFTER initial load to prevent flooding)
        pendingInquiries.forEach(iq => {
          if (!inquiryToastIdsRef.current[iq.id]) {
            if (!isInitialInquiryLoadRef.current) {
              // New inquiry detected!
              /* Notification pop-up disabled as requested
              const tId = toast.info("Pending Inquiry", {
                description: `${iq.name || "Unknown"} from ${iq.affiliation || "Unknown"}`,
                duration: Infinity, // Does not expire
                action: {
                  label: "View",
                  onClick: () => {
                    window.location.href = `/admin/inquiry/${iq.id}`;
                  },
                },
              });
              inquiryToastIdsRef.current[iq.id] = tId;
              */
              inquiryToastIdsRef.current[iq.id] = "suppressed";
            } else {
              // Mark as tracked during initial load so we don't toast later
              inquiryToastIdsRef.current[iq.id] = "existing";
            }
          }
        });

        previousInquiryCountRef.current = count;
        isInitialInquiryLoadRef.current = false;
      },
      (error) => {
        console.error("Error listening to inquiry notifications:", error);
      }
    );

    return () => {
      // Clean up inquiry toasts
      Object.values(inquiryToastIdsRef.current).forEach(id => toast.dismiss(id));
      
      unsubscribeMemberApprovals();
      unsubscribeProjectRequests();
      unsubscribeInquiries();
    };
  }, []);

  // Separate effect: listen to unacknowledged official receipts
  useEffect(() => {
    if (!orToastIdsRef.current) orToastIdsRef.current = {};
    const orQuery = query(
      collectionGroup(db, "officialReceipts"),
      where("acknowledgedByAdmin", "==", false)
    );
    const unsubscribeOr = onSnapshot(
      orQuery,
      (snapshot) => {
        const csNumbers = new Set<string>();
        let pendingReceiptCount = 0;
        snapshot.docs.forEach((d) => {
          const data = d.data();
          // Skip receipts that the admin has already returned — treat returned as "seen"
          if (data.returnedByAdmin === true) {
            // Dismiss any lingering toast for this doc
            if (orToastIdsRef.current![d.id]) {
              toast.dismiss(orToastIdsRef.current![d.id]);
              delete orToastIdsRef.current![d.id];
            }
            return;
          }
          pendingReceiptCount += 1;
          const csNum: string | undefined = data.chargeSlipNumber;
          if (csNum) csNumbers.add(csNum);

          // Toast for new uploads (skip initial load)
          if (!isInitialOrLoadRef.current && !orToastIdsRef.current![d.id]) {
            const tId = toast.info("New OR Uploaded", {
              description: `Client uploaded a receipt for Charge Slip ${csNum || d.id}`,
              duration: Infinity,
              action: {
                label: "View",
                onClick: () => {
                  window.location.href = `/admin/charge-slips/${csNum || ""}`;
                },
              },
            });
            orToastIdsRef.current![d.id] = tId;
          } else if (isInitialOrLoadRef.current) {
            orToastIdsRef.current![d.id] = "existing";
          }
        });

        // Dismiss toasts for receipts that are now acknowledged (no longer in snapshot)
        const currentDocIds = new Set(snapshot.docs.map((d) => d.id));
        Object.keys(orToastIdsRef.current!).forEach((id) => {
          if (!currentDocIds.has(id)) {
            toast.dismiss(orToastIdsRef.current![id]);
            delete orToastIdsRef.current![id];
          }
        });

        setNewOrCount(pendingReceiptCount);
        setNewOrChargeSlipNumbers(csNumbers);
        try {
          localStorage.setItem('pgc_or_count', String(pendingReceiptCount));
          localStorage.setItem('pgc_or_cs_nums', JSON.stringify([...csNumbers]));
        } catch {}
        isInitialOrLoadRef.current = false;
      },
      (error) => {
        console.error("Error listening to OR notifications:", error);
      }
    );
    return () => unsubscribeOr();
  }, []);

  // Listen to charge slips with status "pending" — drives the sidebar badge count
  useEffect(() => {
    const q = query(
      collection(db, "chargeSlips"),
      where("status", "==", "pending")
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setPendingChargeSlipCount(snapshot.size);
      },
      (error) => {
        console.error("Error listening to pending charge slips:", error);
      }
    );
    return () => unsubscribe();
  }, []);

  // Listen to unacknowledged client form submissions - drives the Sidebar Projects badge
  useEffect(() => {
    const q = query(
      collectionGroup(db, "clientFormSubmissions"),
      where("acknowledgedByAdmin", "==", false)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // We count unique project IDs (pid) from the submissions
        const uniqueProjectPids = new Set<string>();
        snapshot.docs.forEach((doc) => {
          const pid = doc.data().pid;
          if (pid) uniqueProjectPids.add(pid);
        });
        setProjectUploadCount(uniqueProjectPids.size);
      },
      (error) => {
        console.error("Error listening to project form notifications:", error);
      }
    );
    return () => unsubscribe();
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
        /* Notification pop-up disabled as requested
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
        */
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
    inquiryCount,
    newOrCount,
    newOrChargeSlipNumbers,
    pendingChargeSlipCount,
    projectUploadCount,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
}
