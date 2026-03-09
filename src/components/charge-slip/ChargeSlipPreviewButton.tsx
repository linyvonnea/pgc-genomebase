// src/components/charge-slip/ChargeSlipPreviewButton.tsx
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
import { PDFViewer, PDFDownloadLink, pdf } from "@react-pdf/renderer";
import { ChargeSlipPDF } from "./ChargeSlipPDF";
import { ChargeSlipRecord } from "@/types/ChargeSlipRecord";
import { normalizeDate } from "@/lib/formatters";
import { logActivity } from "@/services/activityLogService";
import useAuth from "@/hooks/useAuth";

interface Props {
  record: ChargeSlipRecord;
}

export default function ChargeSlipPreviewButton({ record }: Props) {
  const { adminInfo } = useAuth();
  const [open, setOpen] = useState(false);

  const handleDownload = async () => {
    // Log DOWNLOAD activity
    await logActivity({
      userId: adminInfo?.email || "system",
      userEmail: adminInfo?.email || "system@pgc.admin",
      userName: adminInfo?.name || "System",
      action: "DOWNLOAD",
      entityType: "charge_slip",
      entityId: record.referenceNumber || record.chargeSlipNumber,
      entityName: `Charge Slip ${record.chargeSlipNumber}`,
      description: `Downloaded charge slip PDF: ${record.chargeSlipNumber}`,
    });
  };

  const pdfProps = {
    services: record.services,
    client: record.client,
    project: record.project,
    chargeSlipNumber: record.chargeSlipNumber,
    orNumber: record.orNumber ?? "",
    useInternalPrice: record.useInternalPrice,
    useAffiliationAsClientName: record.useAffiliationAsClientName,
    preparedBy: record.preparedBy,
    referenceNumber: record.referenceNumber,
    clientInfo: record.clientInfo,
    approvedBy: record.approvedBy || {
      name: "VICTOR MARCO EMMANUEL N. FERRIOLS, Ph.D.",
      position: "AED, PGC Visayas",
    },
    dateIssued: normalizeDate(record.dateIssued ?? ""),
    subtotal: record.subtotal,
    discount: record.discount,
    total: record.total,
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">📄 Preview Charge Slip</Button>
      </DialogTrigger>

      <DialogContent
        className="max-w-5xl w-full h-[90vh] flex flex-col"
        aria-describedby="pdf-preview-desc"
      >
        <div id="pdf-preview-desc" className="sr-only">
          This is a preview of the generated charge slip PDF.
        </div>

        <DialogHeader>
          <DialogTitle>Charge Slip Preview</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden border">
          <PDFViewer style={{ width: "100%", height: "100%", border: "none" }}>
            <ChargeSlipPDF {...pdfProps} />
          </PDFViewer>
        </div>

        <div className="pt-4 flex justify-end">
          <PDFDownloadLink
            document={<ChargeSlipPDF {...pdfProps} />}
            fileName={`ChargeSlip-${record.chargeSlipNumber}.pdf`}
          >
            {({ loading }) => (
              <Button 
                disabled={loading} 
                variant="secondary"
                onClick={handleDownload}
              >
                {loading ? "Preparing..." : "⬇ Download PDF"}
              </Button>
            )}
          </PDFDownloadLink>
        </div>
      </DialogContent>
    </Dialog>
  );
}
