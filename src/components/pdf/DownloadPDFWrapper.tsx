// src/components/pdf/DownloadPDFWrapper.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { QuotationPDF } from "@/components/quotation/QuotationPDF";
import { SelectedService as StrictSelectedService } from "@/types/Quotation";
import { EditableSelectedService } from "@/types/SelectedService";

interface Props {
  services: EditableSelectedService[];
  clientInfo: {
    name: string;
    institution: string;
    designation: string;
    email: string;
  };
  referenceNumber: string;
  useInternalPrice: boolean;
}

export default function DownloadPDFWrapper({
  services,
  clientInfo,
  referenceNumber,
  useInternalPrice,
}: Props) {
  const [open, setOpen] = useState(false);

  const cleanedServices: StrictSelectedService[] = services
    .filter((svc) => typeof svc.quantity === "number" && svc.quantity > 0)
    .map((svc) => ({ ...svc, quantity: svc.quantity as number }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">Preview PDF</Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl p-4">
        <div className="h-[80vh] overflow-y-scroll bg-white">
          <QuotationPDF
            services={cleanedServices}
            clientInfo={clientInfo}
            referenceNumber={referenceNumber}
            useInternalPrice={useInternalPrice}
          />
        </div>
        <PDFDownloadLink
          document={
            <QuotationPDF
              services={cleanedServices}
              clientInfo={clientInfo}
              referenceNumber={referenceNumber}
              useInternalPrice={useInternalPrice}
            />
          }
          fileName={`${referenceNumber}.pdf`}
        >
          {({ loading }) => (
            <Button disabled={loading} className="mt-4">
              {loading ? "Preparing..." : "Download Final PDF"}
            </Button>
          )}
        </PDFDownloadLink>
      </DialogContent>
    </Dialog>
  );
}