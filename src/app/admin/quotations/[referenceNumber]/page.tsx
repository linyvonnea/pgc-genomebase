// src/app/admin/quotations/[referenceNumber]/page.tsx

import QuotationDetailPageClient from "@/components/QuotationDetailPageClient";
import { PermissionGuard } from "@/components/PermissionGuard";

export default function Page() {
  return (
    <PermissionGuard module="quotations" action="view">
      <QuotationDetailPageClient />
    </PermissionGuard>
  );
}