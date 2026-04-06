"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { AddInquiryModal } from "@/components/forms/InquiryModalForm";
import { DataTable } from "./data-table";
import { columns as createColumns } from "./columns";
import { Inquiry } from "@/types/Inquiry";
import { CatalogItem } from "@/types/CatalogSettings";
import useAuth from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { subscribeToInquiries } from "@/services/inquiryService";
import { getCatalogSettings } from "@/services/catalogSettingsService";
import {
  subscribeToAllAdminUnreadCounts,
} from "@/services/quotationThreadService";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { InquiryDetailSheet } from "@/components/admin/InquiryDetailSheet";

interface InquiryPageClientProps {
  data: Inquiry[];
}

export function InquiryPageClient({
  data: initialData,
}: InquiryPageClientProps) {
  const { adminInfo } = useAuth();
  const router = useRouter();
  const { canCreate } = usePermissions(adminInfo?.role);
  const [inquiries, setInquiries] = useState<Inquiry[]>(initialData);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [unreadInquiryIds, setUnreadInquiryIds] = useState<Set<string>>(new Set());
  const [statusCatalog, setStatusCatalog] = useState<CatalogItem[]>([]);
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

  useEffect(() => {
    let isMounted = true;
    getCatalogSettings()
      .then((settings) => {
        if (isMounted) {
          setStatusCatalog(settings.inquiryStatuses || []);
        }
      })
      .catch((error) => {
        console.error("Failed to load inquiry status catalog:", error);
        if (isMounted) setStatusCatalog([]);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Subscribe to all threads that have unread admin messages
  useEffect(() => {
    const unsubscribe = subscribeToAllAdminUnreadCounts((unreadThreads) => {
      const newIds = new Set(unreadThreads.map((t) => t.inquiryId));

      if (!isInitialLoadRef.current) {
        // Fire a toast only for inquiry IDs that are newly unread this cycle
        unreadThreads.forEach((thread) => {
          if (!prevUnreadIdsRef.current.has(thread.inquiryId)) {
            /* Notification pop-up disabled as requested
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
            */
          }
        });
      }

      isInitialLoadRef.current = false;
      prevUnreadIdsRef.current = newIds;
      setUnreadInquiryIds(newIds);
    });

    return () => unsubscribe();
  }, [router]);

  // Create columns with catalog colors
  const columns = useMemo(() => createColumns(statusCatalog), [statusCatalog]);

  return (
    <div className="w-full px-4 py-4 space-y-3">
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
          statusCatalog={statusCatalog}
          onRowClick={(inquiry) => setSelectedInquiry(inquiry as Inquiry)}
        />
      </div>

      {/* Inquiry Detail Side Panel */}
      <InquiryDetailSheet
        inquiry={selectedInquiry}
        open={!!selectedInquiry}
        onClose={() => setSelectedInquiry(null)}
        onInquiryUpdated={() => setSelectedInquiry(null)}
      />

      {/* FloatingChatWidget is rendered globally in admin/layout.tsx via GlobalChatWidget */}
    </div>
  );
}
