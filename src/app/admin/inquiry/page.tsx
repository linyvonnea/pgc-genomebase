/**
 * Admin Inquiry Management Page
 * 
 * This is the main page component for the admin inquiry management interface.
 * It displays a comprehensive dashboard for viewing, filtering, and managing
 * all inquiries submitted to the system.
 * 
 * Used in:
 * - Admin dashboard navigation (/admin/inquiry)
 * - Primary interface for inquiry CRUD operations
 * - Administrative workflow management
 * 
 */

import { columns } from "./columns"
import { DataTable } from "./data-table"
import { Inquiry } from "@/types/Inquiry"
import { getInquiries } from "@/services/inquiryService"
import { AddInquiryModal } from "@/components/forms/InquiryModalForm"
import { revalidatePath } from "next/cache"

// Force dynamic rendering - this prevents static generation
export const dynamic = 'force-dynamic';
// Alternatively, you can use:
// export const revalidate = 0;

/**
 * Server-side data fetching function
 * 
 * Retrieves all inquiries from Firestore using the inquiry service.
 * Implements error handling to prevent page crashes if database is unavailable.
 * This function runs on the server during page generation.
 */
async function getData(): Promise<Inquiry[]> {
  try {
    // Fetch inquiries using the service layer
    const inquiries = await getInquiries();
    return inquiries;
  } catch (error) {
    console.error("Failed to fetch inquiries:", error);
    return [];
  }
}

/**
 * Main Admin Inquiry Page Component
 * 
 * Layout Structure:
 * 1. Header with title and "Add Inquiry" button
 * 2. Statistics cards showing counts by status
 * 3. Interactive data table with all inquiry records
 */
export default async function InquiryPage() {
  // Fetch inquiry data on the server
  const data = await getData()

  /**
   * Server action to refresh the page data
   * 
   * This function can be called from client components to trigger
   * a refresh of the page data without a full page reload.
   * Uses Next.js revalidatePath to invalidate the cache.
   */
  const handleRefresh = async () => {
    'use server'
    revalidatePath('/admin/inquiry')
  }

  // Calculate statistics for the dashboard cards
  const approvedClientCount = data.filter(inquiry => inquiry.status === 'Approved Client').length
  const quotationOnlyCount = data.filter(inquiry => inquiry.status === 'Quotation Only').length
  const pendingCount = data.filter(inquiry => inquiry.status === 'Pending').length
  const totalCount = data.length

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
          {/* Add new inquiry button - opens modal */}
          <AddInquiryModal />
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
        {/* 
          Uses the DataTable component with predefined columns.
          Provides sorting, filtering, pagination, and search functionality.
          Data is passed down from server-side fetch.
        */}
        <DataTable columns={columns} data={data} />
      </div>
    </div>
  )
}