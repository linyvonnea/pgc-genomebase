// src/components/pdf/DownloadPDFWrapper.tsx
"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import { QuotationPDF } from "@/components/quotation/QuotationPDF";
import { Button } from "@/components/ui/button";
import type { SelectedService } from "@/types/SelectedService";

export default function DownloadPDFWrapper({
  referenceNumber,
  services,
  clientInfo,
  useInternalPrice,
}: {
  referenceNumber: string;
  services: SelectedService[];
  clientInfo: {
    name: string;
    institution: string;
    designation: string;
    email: string;
  };
  useInternalPrice: boolean;
}) {
  return (
    <PDFDownloadLink
      document={
        <QuotationPDF
          referenceNumber={referenceNumber}
          services={services}
          clientInfo={clientInfo}
          useInternalPrice={useInternalPrice}
        />
      }
      fileName={`${referenceNumber}.pdf`}
    >
      {({ loading }) => (
        <Button variant="outline" disabled={loading}>
          {loading ? "Preparing PDF..." : "Download PDF"}
        </Button>
      )}
    </PDFDownloadLink>
  );
}