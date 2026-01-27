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

  // Calculate statistics for the dashboard cards
  const approvedClientCount = data.filter(inquiry => inquiry.status === 'Approved Client').length;
  const quotationOnlyCount = data.filter(inquiry => inquiry.status === 'Quotation Only').length;
  const pendingCount = data.filter(inquiry => inquiry.status === 'Pending').length;
  const totalCount = data.length;

  return (
    <div className="container mx-auto py-10">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inquiry Management</h1>
            <p className="text-muted-foreground">
              Manage and review research inquiries submitted to the database.
            </p>
          </div>
          {/* Add new inquiry button - only show if user has create permission */}
          {canCreate("inquiries") && <AddInquiryModal />}
        </div>
        
        {/* Statistics Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Approved Clients Card - Green theme */}
          <div className="rounded-lg border p-4">
            <div className="text-2xl font-bold text-green-600">{approvedClientCount}</div>
            <div className="text-sm text-muted-foreground">Approved Clients</div>
          </div>
          
          {/* Quotation Only Card - Blue theme */}
          <div className="rounded-lg border p-4">
            <div className="text-2xl font-bold text-blue-600">{quotationOnlyCount}</div>
            <div className="text-sm text-muted-foreground">Quotation Only</div>
          </div>
          
          {/* Pending Inquiries Card - Yellow theme */}
          <div className="rounded-lg border p-4">
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </div>
          
          {/* Total Count Card - Gray theme */}
          <div className="rounded-lg border p-4">
            <div className="text-2xl font-bold text-gray-600">{totalCount}</div>
            <div className="text-sm text-muted-foreground">Total Inquiries</div>
          </div>
        </div>
        
        {/* Main Data Table */}
        <DataTable columns={columns} data={data} />
      </div>
    </div>
  );
}
