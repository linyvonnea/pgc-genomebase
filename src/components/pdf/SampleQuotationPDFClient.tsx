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
  console.log("Rendering SampleQuotationPDFClient with record:", record);

  if (!record) {
    return (
      <div className="flex items-center justify-center h-[800px] bg-red-50 text-red-500">
        No record data provided to PDF renderer.
      </div>
    );
  }

  return (
    <div className="w-full h-[800px] bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
      <PDFViewer width="100%" height="100%" showToolbar={true} className="border-none">
        <SampleFormPDF record={record} />
      </PDFViewer>
    </div>
  );
}
