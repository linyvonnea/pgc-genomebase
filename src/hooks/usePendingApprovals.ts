// Real-time hook for pending member approval count.
// Used to display notification badges in the admin sidebar.

import { useState, useEffect } from "react";
import { onPendingApprovalsCount } from "@/services/memberApprovalService";

export function usePendingApprovals() {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const unsubscribe = onPendingApprovalsCount((count) => {
      setPendingCount(count);
    });

    return () => unsubscribe();
  }, []);

  return { pendingCount };
}
