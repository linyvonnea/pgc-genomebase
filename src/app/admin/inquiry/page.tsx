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

import { Inquiry } from "@/types/Inquiry"
import { getInquiries } from "@/services/inquiryService"
import { revalidatePath } from "next/cache"
import { PermissionGuard } from "@/components/PermissionGuard"
import { InquiryPageClient } from "./page-client"

// Force dynamic rendering - this prevents static generation
export const dynamic = 'force-dynamic';

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

  return (
    <PermissionGuard module="inquiries" action="view">
      <InquiryPageClient data={data} />
    </PermissionGuard>
  )
}
