// src/components/pdf/SampleQuotationPDFClient.tsx
"use client";

import { PDFViewer } from "@react-pdf/renderer";
import { SampleFormPDF } from "./SampleFormPDF";
import { SampleFormRecord } from "@/types/SampleForm";

export default function SampleQuotationPDFClient({
  record,
}: {
  record: SampleFormRecord;
}) {
  return (
    <PDFViewer style={{ width: "100%", height: "800px", border: "none" }}>
      <SampleFormPDF record={record} />
    </PDFViewer>
  );
}
