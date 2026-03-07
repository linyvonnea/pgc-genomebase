"use client";

import { useState, useEffect, useRef } from "react";
import { AddInquiryModal } from "@/components/forms/InquiryModalForm";
import { DataTable } from "./data-table";
import { columns } from "./columns";
import { Inquiry } from "@/types/Inquiry";
import useAuth from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { subscribeToInquiries } from "@/services/inquiryService";
import {
  subscribeToAllAdminUnreadCounts,
} from "@/services/quotationThreadService";
import FloatingChatWidget from "@/components/chat/FloatingChatWidget";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";

interface InquiryPageClientProps {
  data: Inquiry[];
}

export function InquiryPageClient({
  data: initialData,
}: InquiryPageClientProps) {
  const { adminInfo } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const inquiryIdToFocus = searchParams.get("inquiryId") || "";
  const focusMode = searchParams.get("focus");
  const { canCreate } = usePermissions(adminInfo?.role);
  const [inquiries, setInquiries] = useState<Inquiry[]>(initialData);
  const [unreadInquiryIds, setUnreadInquiryIds] = useState<Set<string>>(new Set());
  // Track previous unread IDs to detect newly arriving messages
  const prevUnreadIdsRef = useRef<Set<string>>(new Set());
  // Suppress toasts on initial load
  const isInitialLoadRef = useRef(true);

  // Subscribe to real-time inquiry updates
  useEffect(() => {
    const unsubscribe = subscribeToInquiries((updatedInquiries) => {
      setInquiries(updatedInquiries);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to all threads that have unread admin messages
  useEffect(() => {
    const unsubscribe = subscribeToAllAdminUnreadCounts((unreadThreads) => {
      const newIds = new Set(unreadThreads.map((t) => t.inquiryId));

      if (!isInitialLoadRef.current) {
        // Fire a toast only for inquiry IDs that are newly unread this cycle
        unreadThreads.forEach((thread) => {
          if (!prevUnreadIdsRef.current.has(thread.inquiryId)) {
            toast.info(`New message from ${thread.clientName}`, {
              description: `Inquiry ID: ${thread.inquiryId}`,
              icon: <MessageCircle className="w-4 h-4 text-blue-500" />,
              action: {
                label: "View",
                onClick: () =>
                  router.push(
                    `/admin/inquiry?inquiryId=${thread.inquiryId}&focus=messages`
                  ),
              },
              duration: 6000,
            });
          }
        });
      }

      isInitialLoadRef.current = false;
      prevUnreadIdsRef.current = newIds;
      setUnreadInquiryIds(newIds);
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <div className="container mx-auto py-4 space-y-3">
      <div className="space-y-1">
        {/* Page Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Inquiry Management
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage and review research inquiries with advanced filtering and
              overview.
            </p>
          </div>
          {/* Add new inquiry button - only show if user has create permission */}
          {canCreate("inquiries") && <AddInquiryModal />}
        </div>
        {/* Enhanced Data Table with Filters & Overview */}
        <DataTable
          columns={columns}
          data={inquiries}
          unreadInquiryIds={unreadInquiryIds}
        />
      </div>

      {focusMode === "messages" && inquiryIdToFocus && (
        <FloatingChatWidget
          key={`chat-${inquiryIdToFocus}`}
          inquiryId={inquiryIdToFocus}
          role="admin"
          className="!bottom-20 mb-2"
        />
      )}
    </div>
  );
}
