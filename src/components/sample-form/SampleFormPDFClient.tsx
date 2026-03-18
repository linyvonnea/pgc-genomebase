// src/components/sample-form/SampleFormPDFClient.tsx
"use client";

import { PDFViewer } from "@react-pdf/renderer";
import { SampleFormRecord } from "@/types/SampleForm";
import { SampleFormPrintPDF } from "@/components/sample-form/SampleFormPrintPDF";

export default function SampleFormPDFClient({ form }: { form: SampleFormRecord }) {
  console.log("Rendering SampleFormPDFClient with form:", form);
  return (
    <PDFViewer width="100%" height="700" style={{ border: "none" }}>
      <SampleFormPrintPDF />
    </PDFViewer>
  );
}
