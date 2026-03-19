// src/components/sample-form/SampleFormPDFViewer.tsx
"use client";

import dynamic from "next/dynamic";
import { SampleFormRecord } from "@/types/SampleForm";

// Dynamic import keeps @react-pdf/renderer off the SSR bundle.
const SampleFormPDFClient = dynamic(() => import("./SampleFormPDFClient"), {
  ssr: false,
  loading: () => <p>Loading PDF preview...</p>,
});

export function SampleFormPDFViewer({ form }: { form: SampleFormRecord }) {
  return <SampleFormPDFClient form={form} />;
}
