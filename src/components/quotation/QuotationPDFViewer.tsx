// src/components/quotation/QuotationPDFViewer.tsx
"use client";

import dynamic from "next/dynamic";

const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => <p>Loading PDF preview...</p>,
  }
);

import { QuotationPDF } from "./QuotationPDF";
import { QuotationRecord } from "@/types/Quotation";

type Props = {
  quotation: QuotationRecord;
};

export function QuotationPDFViewer({ quotation }: Props) {
  return (
    <PDFViewer width="100%" height="600">
      <QuotationPDF
        referenceNumber={quotation.referenceNumber}
        services={quotation.services}
        clientInfo={quotation.clientInfo}
        useInternalPrice={quotation.isInternal}
        remarks={quotation.remarks}
      />
    </PDFViewer>
  );
}