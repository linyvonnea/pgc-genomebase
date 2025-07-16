// src/app/admin/inquiry/page.tsx
import { columns } from "./columns"
import { DataTable } from "./data-table"
import { Inquiry } from "@/types/Inquiry"
import { getInquiries } from "@/services/inquiryService"
import { AddInquiryModal } from "@/components/forms/InquiryModalForm"
import { revalidatePath } from "next/cache"

async function getData(): Promise<Inquiry[]> {
  try {
    const inquiries = await getInquiries();
    return inquiries;
  } catch (error) {
    console.error("Failed to fetch inquiries:", error);
    // Return empty array if there's an error
    return [];
  }
}

export default async function InquiryPage() {
  const data = await getData()

  const handleRefresh = async () => {
    'use server'
    revalidatePath('/admin/inquiry')
  }

  // Calculate some stats for the header
  const approvedClientCount = data.filter(inquiry => inquiry.status === 'Approved Client').length
  const quotationOnlyCount = data.filter(inquiry => inquiry.status === 'Quotation Only').length
  const pendingCount = data.filter(inquiry => inquiry.status === 'Pending').length
  const totalCount = data.length

  return (
    <div className="container mx-auto py-10">
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inquiry Management</h1>
            <p className="text-muted-foreground">
              Manage and review research inquiries submitted to the database.
            </p>
          </div>
          <AddInquiryModal />
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-lg border p-4">
            <div className="text-2xl font-bold text-green-600">{approvedClientCount}</div>
            <div className="text-sm text-muted-foreground">Approved Clients</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-2xl font-bold text-blue-600">{quotationOnlyCount}</div>
            <div className="text-sm text-muted-foreground">Quotation Only</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-2xl font-bold text-gray-600">{totalCount}</div>
            <div className="text-sm text-muted-foreground">Total Inquiries</div>
          </div>
        </div>
        
        {/* Data Table */}
        <DataTable columns={columns} data={data} />
      </div>
    </div>
  )
}