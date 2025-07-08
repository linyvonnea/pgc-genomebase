// src/components/pdf/DownloadPDFLink.tsx
"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import { QuotationPDF } from "@/components/quotation/QuotationPDF";
import { Button } from "@/components/ui/button";
import type { SelectedService } from "@/types/SelectedService";

interface Props {
  services: SelectedService[];
  clientInfo: {
    name: string;
    institution: string;
    designation: string;
    email: string;
  };
  referenceNumber: string;
  useInternalPrice: boolean;
  remarks?: string;
}

export default function DownloadPDFLink({
  services,
  clientInfo,
  referenceNumber,
  useInternalPrice,
  remarks,
}: Props) {
  return (
    <PDFDownloadLink
      document={
        <QuotationPDF
          services={services}
          clientInfo={clientInfo}
          referenceNumber={referenceNumber}
          useInternalPrice={useInternalPrice}
          remarks={remarks}
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