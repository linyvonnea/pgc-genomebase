// src/components/pdf/SamplePDFViewer.tsx
"use client";

import dynamic from "next/dynamic";
import { SampleFormRecord } from "@/types/SampleForm";
import { Loader2 } from "lucide-react";

// Dynamically imported to prevent SSR — @react-pdf/renderer uses browser APIs
const SampleQuotationPDFClient = dynamic(
  () => import("./SampleQuotationPDFClient"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[800px] bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    ),
  }
);

export function SamplePDFViewer({ record }: { record: SampleFormRecord }) {
  return <SampleQuotationPDFClient record={record} />;
}
