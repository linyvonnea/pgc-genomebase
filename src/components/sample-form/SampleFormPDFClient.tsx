// src/components/sample-form/SampleFormPDFClient.tsx
"use client";

import { PDFViewer } from "@react-pdf/renderer";
import { SampleFormRecord } from "@/types/SampleForm";
import { SampleSubmissionFormPDF } from "@/components/pdf/SampleSubmissionFormPDF";

export default function SampleFormPDFClient({ form }: { form: SampleFormRecord }) {
  console.log("Rendering SampleFormPDFClient with form:", form);
  
  if (!form) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-slate-500">
        No form data available for preview.
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height: "700px" }}>
      <PDFViewer width="100%" height="100%" showToolbar={true} style={{ border: "none" }}>
        <SampleSubmissionFormPDF form={form} />
      </PDFViewer>
    </div>
  );
}
