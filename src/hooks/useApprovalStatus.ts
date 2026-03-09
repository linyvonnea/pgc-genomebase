// Custom hook to listen for real-time approval status changes
// Used in client portal to notify users when their team members are approved/rejected

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ApprovalStatus } from "@/types/MemberApproval";

interface ApprovalStatusData {
  status: ApprovalStatus | null;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewNotes?: string;
  reviewedAt?: Date;
}

/**
 * Real-time listener for member approval status changes.
 * Notifies client portal users when their submission is approved/rejected.
 */
export function useApprovalStatus(
  inquiryId: string | null,
  projectPid: string | null
): ApprovalStatusData {
  const [statusData, setStatusData] = useState<ApprovalStatusData>({
    status: null,
  });

  useEffect(() => {
    if (!inquiryId || !projectPid) {
      setStatusData({ status: null });
      return;
    }

    const docId = `${inquiryId}_${projectPid}`;
    const docRef = doc(db, "memberApprovals", docId);

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setStatusData({ status: null });
          return;
        }

        const data = snapshot.data();
        setStatusData({
          status: data.status || null,
          reviewedBy: data.reviewedBy,
          reviewedByName: data.reviewedByName,
          reviewNotes: data.reviewNotes,
          reviewedAt: data.reviewedAt?.toDate?.() || data.reviewedAt,
        });
      },
      (error) => {
        console.error("Error listening to approval status:", error);
      }
    );

    return () => unsubscribe();
  }, [inquiryId, projectPid]);

  return statusData;
}
