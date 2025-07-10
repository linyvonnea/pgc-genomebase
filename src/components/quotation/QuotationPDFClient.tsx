// src/components/quotation/QuotationPDFClient.tsx
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
        clientInfo={{
          name: quotation.name,
          email: quotation.email,
          institution: quotation.institution,
          designation: quotation.designation,
        }}
        useInternalPrice={quotation.isInternal}
        preparedBy={quotation.preparedBy}
      />
    </PDFViewer>
  );
}
