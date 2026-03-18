// src/components/sample-form/SampleFormPDFClient.tsx
"use client";

import { PDFViewer } from "@react-pdf/renderer";
import { SampleFormRecord } from "@/types/SampleForm";
import { SampleSubmissionFormPDF } from "@/components/pdf/SampleSubmissionFormPDF";

export default function SampleFormPDFClient({ form }: { form: SampleFormRecord }) {
  return (
    <PDFViewer width="100%" height="700" style={{ border: "none" }}>
      <SampleSubmissionFormPDF form={form} />
    </PDFViewer>
  );
}
