// src/app/admin/sample-forms/[id]/page.tsx
import { PermissionGuard } from "@/components/PermissionGuard";
import SampleFormDetailPageClient from "@/components/sample-form/SampleFormDetailPageClient";

export default function AdminSampleFormDetailPage() {
  return (
    <PermissionGuard module="chargeSlips" action="view">
      <SampleFormDetailPageClient />
    </PermissionGuard>
  );
}
