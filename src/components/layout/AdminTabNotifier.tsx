/**
 * AdminTabNotifier
 *
 * Invisible component mounted in the admin layout.
 * Aggregates all pending notification counts and triggers the tab-title
 * blink via `useTabTitleBlink` when the admin is away from the tab.
 *
 * Sources counted:
 *  - Unread client messages  (useMessageNotifications → totalUnread)
 *  - Pending inquiries       (useApprovalNotifications → inquiryCount)
 *  - Pending member/project approvals (useApprovalNotifications → pendingCount)
 *  - Pending charge slips    (useApprovalNotifications → pendingChargeSlipCount)
 *  - Unacknowledged official receipts (useApprovalNotifications → newOrCount)
 */

"use client";

import { useMessageNotifications } from "@/hooks/useMessageNotifications";
import { useApprovalNotifications } from "@/hooks/useApprovalNotifications";
import { useTabTitleBlink } from "@/hooks/useTabTitleBlink";

export function AdminTabNotifier() {
  const { totalUnread } = useMessageNotifications();
  const {
    pendingCount,
    inquiryCount,
    pendingChargeSlipCount,
    newOrCount,
  } = useApprovalNotifications();

  const totalNotifications =
    totalUnread + pendingCount + inquiryCount + pendingChargeSlipCount + newOrCount;

  useTabTitleBlink(totalNotifications);

  // Renders nothing — side-effect only
  return null;
}
