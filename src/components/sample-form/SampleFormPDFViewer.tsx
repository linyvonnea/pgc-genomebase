// src/components/sample-form/SampleFormPDFViewer.tsx
"use client";

import dynamic from "next/dynamic";
import { SampleFormRecord } from "@/types/SampleForm";

// Dynamic import keeps @react-pdf/renderer off the SSR bundle.
const SampleFormPDFClient = dynamic(() => import("./SampleFormPDFClient"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 text-sm text-slate-500">
      Loading PDF preview…
    </div>
  ),
});

export function SampleFormPDFViewer({ form }: { form: SampleFormRecord }) {
  return <SampleFormPDFClient form={form} />;
}
