// src/app/admin/quotations/builder/page.tsx
"use client";

import QuotationBuilder from "@/components/quotation/QuotationBuilder";
import { PermissionGuard } from "@/components/PermissionGuard";

export default function BuilderPage() {
  return (
    <PermissionGuard module="quotations" action="view">
      <main className="p-4">
        <h1 className="text-2xl font-semibold mb-4">Quotation Builder</h1>
        <QuotationBuilder />
      </main>
    </PermissionGuard>
  );
}