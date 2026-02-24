"use client";

import { useState, useEffect } from "react";
import { AddInquiryModal } from "@/components/forms/InquiryModalForm";
import { DataTable } from "./data-table";
import { columns } from "./columns";
import { Inquiry } from "@/types/Inquiry";
import useAuth from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { subscribeToInquiries } from "@/services/inquiryService";

interface InquiryPageClientProps {
  data: Inquiry[];
}

export function InquiryPageClient({ data: initialData }: InquiryPageClientProps) {
  const { adminInfo } = useAuth();
  const { canCreate } = usePermissions(adminInfo?.role);
  const [inquiries, setInquiries] = useState<Inquiry[]>(initialData);

  // Subscribe to real-time inquiry updates
  useEffect(() => {
    const unsubscribe = subscribeToInquiries((updatedInquiries) => {
      setInquiries(updatedInquiries);
    });

    // Cleanup on unmount
    return () => unsubscribe();
  }, []);

  return (
    <div className="container mx-auto py-4 space-y-3">
      <div className="space-y-1">
        {/* Page Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Inquiry Management</h1>
            <p className="text-sm text-muted-foreground">
              Manage and review research inquiries with advanced filtering and overview.
            </p>
          </div>
          {/* Add new inquiry button - only show if user has create permission */}
          {canCreate("inquiries") && <AddInquiryModal />}
        </div>
        {/* Enhanced Data Table with Filters & Overview */}
        <DataTable columns={columns} data={inquiries} />
      </div>
    </div>
  );
}

