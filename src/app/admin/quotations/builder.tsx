// src/app/admin/quotations/builder.tsx
"use client";

import QuotationBuilder from "@/components/quotation/QuotationBuilder";

export default function BuilderPage() {
  return (
    <main className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Quotation Builder</h1>
      <QuotationBuilder />
    </main>
  );
}