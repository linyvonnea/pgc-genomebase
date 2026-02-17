/**
 * Admin Quotation Thread Management Page
 * 
 * This page provides a comprehensive interface for managing a specific
 * quotation thread, including inquiry details, quotation creation/editing,
 * and messaging with the client.
 */

import { getQuotationThread } from "@/services/quotationThreadService";
import { getInquiryById } from "@/services/inquiryService";
import { PermissionGuard } from "@/components/PermissionGuard";
import { QuotationThreadPageClient } from "@/app/admin/quotation-threads/[inquiryId]/page-client";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    inquiryId: string;
  }>;
}

/**
 * Server-side data fetching for thread and inquiry details
 */
async function getData(inquiryId: string) {
  try {
    const [thread, inquiry] = await Promise.all([
      getQuotationThread(inquiryId),
      getInquiryById(inquiryId),
    ]);

    if (!thread || !inquiry) {
      return null;
    }

    return { thread, inquiry };
  } catch (error) {
    console.error("Failed to fetch thread data:", error);
    return null;
  }
}

/**
 * Admin Quotation Thread Page
 * 
 * Layout:
 * 1. Inquiry details card (client info, service details)
 * 2. Thread status and timeline
 * 3. Quotation builder/editor
 * 4. Message interface for admin-client communication
 */
export default async function QuotationThreadPage({ params }: PageProps) {
  const { inquiryId } = await params;
  const data = await getData(inquiryId);

  if (!data) {
    notFound();
  }

  return (
    <PermissionGuard module="quotations" action="view">
      <QuotationThreadPageClient 
        thread={data.thread} 
        inquiry={data.inquiry}
      />
    </PermissionGuard>
  );
}
