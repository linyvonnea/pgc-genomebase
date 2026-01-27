// src/app/admin/quotations/new/page.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getInquiryById } from "@/services/inquiryService";
import QuotationBuilder from "@/components/quotation/QuotationBuilder";
import { PermissionGuard } from "@/components/PermissionGuard";

export default function NewQuotationPage() {
  return (
    <PermissionGuard module="quotations" action="create">
      <NewQuotationContent />
    </PermissionGuard>
  );
}

function NewQuotationContent() {
  const searchParams = useSearchParams();
  const inquiryId = searchParams.get("inquiryId");

  const { data: inquiry, isLoading, error } = useQuery({
    queryKey: ["inquiry", inquiryId],
    queryFn: () => inquiryId ? getInquiryById(inquiryId) : Promise.resolve(undefined),
    enabled: !!inquiryId,
  });

  if (isLoading) return <div className="p-6">Loading inquiry...</div>;
  if (error || !inquiry) return <div className="p-6">Inquiry not found.</div>;

  return (
    <div className="p-6">
      <QuotationBuilder
        inquiryId={inquiry.id}
        initialClientInfo={{
          name: inquiry.name,
          institution: inquiry.affiliation,
          designation: inquiry.designation,
          email: inquiry.email ?? "",
        }}
      />
    </div>
  );
}