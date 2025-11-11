"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { SelectedService } from "@/types/SelectedService";
import { QuotationPDF } from "@/components/quotation/QuotationPDF";
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";

interface Props {
  referenceNumber: string;
  services: SelectedService[];
  clientInfo: {
    name: string;
    institution: string;
    designation: string;
    email: string;
  };
  useInternalPrice: boolean;
  preparedBy: {
    name: string;
    position: string;
  };
  /** Optional overrides (from Firestore) for migrated quotes */
  subtotal?: number;
  discount?: number;
  total?: number;
}

export default function DownloadButtonSection(props: Props) {
  const [open, setOpen] = useState(false);

  const { subtotal, discount, total } = props;
  const totalsOverride =
    typeof subtotal === "number" && typeof total === "number"
      ? { subtotal, discount: discount ?? 0, total }
      : undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">📄 Preview Quotation</Button>
      </DialogTrigger>

      <DialogContent
        className="max-w-5xl w-full h-[90vh] flex flex-col"
        aria-describedby="pdf-preview-desc"
      >
        <div id="pdf-preview-desc" className="sr-only">
          This is a preview of the generated quotation PDF.
        </div>

        <DialogHeader>
          <DialogTitle>Quotation Preview</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden border">
          <PDFViewer style={{ width: "100%", height: "100%", border: "none" }}>
            <QuotationPDF {...props} totalsOverride={totalsOverride} />
          </PDFViewer>
        </div>

        <div className="pt-4 flex justify-end">
          <PDFDownloadLink
            document={<QuotationPDF {...props} totalsOverride={totalsOverride} />}
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