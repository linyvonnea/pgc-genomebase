// src/components/charge-slip/DownloadChargeSlipViewer.tsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { ChargeSlipPDF } from "./ChargeSlipPDF";
import { ChargeSlipRecord } from "@/types/ChargeSlipRecord";
import { normalizeDate } from "@/lib/formatters";

interface Props {
  record: ChargeSlipRecord;
}

export default function DownloadChargeSlipViewer({ record }: Props) {
  const [open, setOpen] = useState(false);

  const normalizedDate = normalizeDate(record.dateIssued ?? "");

  const pdfDoc = (
    <ChargeSlipPDF
      services={record.services}
      client={record.client}
      project={record.project}
      chargeSlipNumber={record.chargeSlipNumber}
      orNumber={record.orNumber ?? ""}
      useInternalPrice={record.useInternalPrice}
      useAffiliationAsClientName={record.useAffiliationAsClientName}
      preparedBy={record.preparedBy}
      approvedBy={record.approvedBy}
      referenceNumber={record.referenceNumber}
      clientInfo={record.clientInfo}
      dateIssued={normalizedDate}
      subtotal={record.subtotal}
      discount={record.discount}
      total={record.total}
    />
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Preview PDF</Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl p-4">
        <div className="h-[80vh] overflow-y-scroll bg-white">
          {pdfDoc}
        </div>
        <PDFDownloadLink
          document={pdfDoc}
          fileName={`${record.chargeSlipNumber}.pdf`}
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