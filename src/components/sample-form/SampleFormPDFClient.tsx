// src/components/sample-form/SampleFormPDFClient.tsx
"use client";

import { PDFViewer } from "@react-pdf/renderer";
import { SampleFormRecord } from "@/types/SampleForm";
import { SampleSubmissionFormPDF } from "@/components/pdf/SampleSubmissionFormPDF";

export default function SampleFormPDFClient({ form }: { form: SampleFormRecord }) {
  console.log("Rendering SampleFormPDFClient with form:", form);
  
  if (!form) {
    return (
      <div className="flex items-center justify-center h-[500px] text-sm text-slate-500">
        No form data available for preview.
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col bg-slate-100 rounded-lg overflow-hidden border" style={{ height: "650px" }}>
      <PDFViewer 
        width="100%" 
        height="100%" 
        showToolbar={true} 
        style={{ border: "none" }}
      >
        <SampleSubmissionFormPDF form={form} />
      </PDFViewer>
      <div className="p-2 text-[10px] text-slate-400 text-center bg-white border-t">
        PDF Preview Engine Active (Powered by @react-pdf/renderer)
      </div>
    </div>
  );
}
