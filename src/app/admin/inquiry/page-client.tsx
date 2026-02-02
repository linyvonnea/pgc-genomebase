"use client";

import { AddInquiryModal } from "@/components/forms/InquiryModalForm";
import { DataTable } from "./data-table";
import { columns } from "./columns";
import { Inquiry } from "@/types/Inquiry";
import useAuth from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";

interface InquiryPageClientProps {
  data: Inquiry[];
}

export function InquiryPageClient({ data }: InquiryPageClientProps) {
  const { adminInfo } = useAuth();
  const { canCreate } = usePermissions(adminInfo?.role);

  return (
    <div className="container mx-auto py-4 space-y-3">
      <div className="space-y-3">
        {/* Page Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inquiry Management</h1>
            <p className="text-muted-foreground">
              Manage and review research inquiries with advanced filtering and overview.
            </p>
          </div>
          {/* Add new inquiry button - only show if user has create permission */}
          {canCreate("inquiries") && <AddInquiryModal />}
        </div>
        
        {/* Enhanced Data Table with Filters & Overview */}
        <DataTable columns={columns} data={data} />
      </div>
    </div>
  );
}

