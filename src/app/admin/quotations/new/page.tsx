// File: src/app/admin/quotations/new/page.tsx
"use client";

import { useSearchParams } from "next/navigation";
import QuotationBuilder from "@/components/quotation/QuotationBuilder";
import { mockInquiries } from "@/mock/mockInquiries";

export default function NewQuotationPage() {
  const searchParams = useSearchParams();
  const inquiryId = searchParams.get("inquiryId");

  const inquiry = mockInquiries.find((inq) => inq.id === inquiryId);

  if (!inquiry) {
    return <div className="p-6">Inquiry not found.</div>;
  }

  return (
    <div className="p-6">
      <QuotationBuilder
        inquiryId={inquiry.id}
        initialClientInfo={{
          name: inquiry.name,
          institution: inquiry.affiliation,
          designation: inquiry.designation,
          email: inquiry.email,
        }}
      />
    </div>
  );
}
