// src/components/pdf/DownloadButtonSection.tsx
"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { SelectedService } from "@/types/SelectedService";
import { QuotationPDF } from "@/components/quotation/QuotationPDF";
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";

export default function DownloadButtonSection(props: {
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
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">📄 Preview Quotation</Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl w-full h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Quotation Preview</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden border">
          <PDFViewer style={{ width: "100%", height: "100%", border: "none" }}>
            <QuotationPDF {...props} />
          </PDFViewer>
        </div>

        <div className="pt-4 flex justify-end">
          <PDFDownloadLink
            document={<QuotationPDF {...props} />}
            fileName={`Quotation-${props.referenceNumber}.pdf`}
          >
            {({ loading }) => (
              <Button disabled={loading} variant="secondary">
                {loading ? "Preparing..." : "⬇ Download PDF"}
              </Button>
            )}
          </PDFDownloadLink>
        </div>
      </DialogContent>
    </Dialog>
  );
}