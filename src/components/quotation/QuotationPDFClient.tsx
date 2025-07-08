"use client";

import { PDFViewer } from "@react-pdf/renderer";
import { QuotationPDF } from "./QuotationPDF";
import { QuotationRecord } from "@/types/Quotation";

export default function QuotationPDFClient({
  quotation,
}: {
  quotation: QuotationRecord;
}) {
  return (
    <PDFViewer width="100%" height="600">
      <QuotationPDF
        referenceNumber={quotation.referenceNumber}
        services={quotation.services}
        clientInfo={quotation.clientInfo}
        useInternalPrice={quotation.isInternal}
      />
    </PDFViewer>
  );
}