// src/components/quotation/QuotationPDFViewer.tsx

"use client";

import dynamic from "next/dynamic";
import { QuotationRecord } from "@/types/Quotation";

// Dynamic client-only PDF renderer
const QuotationPDFClient = dynamic(() => import("./QuotationPDFClient"), {
  ssr: false,
  loading: () => <p>Loading PDF preview...</p>,
});

export function QuotationPDFViewer({ quotation }: { quotation: QuotationRecord }) {
  return <QuotationPDFClient quotation={quotation} />;
}