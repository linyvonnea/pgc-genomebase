// src/app/admin/quotations/[referenceNumber]/page.tsx
import QuotationDetailPageClient from "@/components/QuotationDetailPageClient";

export default function QuotationDetailPage({
  params,
}: {
  params: { referenceNumber: string };
}) {
  return <QuotationDetailPageClient referenceNumber={params.referenceNumber} />;
}