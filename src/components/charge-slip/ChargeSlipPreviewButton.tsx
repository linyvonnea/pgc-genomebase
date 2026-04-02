// src/components/charge-slip/ChargeSlipPreviewButton.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { pdf } from "@react-pdf/renderer";
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
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const blobUrlRef = useRef<string | null>(null);

  // Generate a blob URL when dialog opens — much faster than PDFViewer
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setBlobUrl(null);

    const generate = async () => {
      const doc = (
        <ChargeSlipPDF
          services={record.services}
          client={record.client}
          project={record.project}
          chargeSlipNumber={record.chargeSlipNumber}
          orNumber={record.orNumber ?? ""}
          isInternal={record.useInternalPrice}
          useInternalPrice={record.useInternalPrice}
          useAffiliationAsClientName={record.useAffiliationAsClientName}
          preparedBy={record.preparedBy}
          referenceNumber={record.referenceNumber}
          clientInfo={record.clientInfo}
          approvedBy={record.approvedBy || {
            name: "VICTOR MARCO EMMANUEL N. FERRIOLS, Ph.D.",
            position: "AED, PGC Visayas",
          }}
          dateIssued={normalizeDate(record.dateIssued ?? "")}
          subtotal={record.subtotal}
          discount={record.discount}
          total={record.total}
        />
      );

      const blob = await pdf(doc).toBlob();
      if (cancelled) return;

      // Revoke any previous blob URL to free memory
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);

      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;
      setBlobUrl(url);
      setLoading(false);
    };

    generate();
    return () => { cancelled = true; };
  }, [open]);

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  const handleDownload = async () => {
    if (blobUrl) {
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `ChargeSlip-${record.chargeSlipNumber}.pdf`;
      a.click();
    }

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

        <div className="flex-1 overflow-hidden border bg-muted/20 flex items-center justify-center">
          {loading && (
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground font-medium">Generating PDF...</p>
            </div>
          )}
          {blobUrl && (
            <iframe
              src={blobUrl}
              style={{ width: "100%", height: "100%", border: "none" }}
              title="Charge Slip Preview"
            />
          )}
        </div>

        <div className="pt-4 flex justify-end">
          <Button
            variant="secondary"
            disabled={loading || !blobUrl}
            onClick={handleDownload}
          >
            {loading ? "Preparing..." : "⬇ Download PDF"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
