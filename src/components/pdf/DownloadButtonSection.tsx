"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { PDFDownloadLink, pdf } from "@react-pdf/renderer";
import { logActivity } from "@/services/activityLogService";
import useAuth from "@/hooks/useAuth";

const quotationPdfCache = new Map<string, Blob>();

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
  const { adminInfo } = useAuth();
  const [open, setOpen] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const blobUrlRef = useRef<string | null>(null);

  const { subtotal, discount, total, referenceNumber } = props;
  const totalsOverride =
    typeof subtotal === "number" && typeof total === "number"
      ? { subtotal, discount: discount ?? 0, total }
      : undefined;

  const pdfDoc = useMemo(
    () => <QuotationPDF {...props} totalsOverride={totalsOverride} />,
    [props, totalsOverride]
  );

  const previewKey = useMemo(() => {
    try {
      return JSON.stringify({
        referenceNumber,
        props,
        totalsOverride,
      });
    } catch {
      return `${referenceNumber}-${props.services.length}`;
    }
  }, [referenceNumber, props, totalsOverride]);

  const handleDownload = async () => {
    // Log DOWNLOAD activity
    await logActivity({
      userId: adminInfo?.email || "system",
      userEmail: adminInfo?.email || "system@pgc.admin",
      userName: adminInfo?.name || "System",
      action: "DOWNLOAD",
      entityType: "quotation",
      entityId: referenceNumber,
      entityName: `Quotation ${referenceNumber}`,
      description: `Downloaded quotation PDF: ${referenceNumber}`,
    });
  };

  useEffect(() => {
    if (!open) {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      setBlobUrl(null);
      setPreviewLoading(false);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);
    setBlobUrl(null);

    const generate = async () => {
      const cached = quotationPdfCache.get(previewKey);
      if (cached) {
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        const url = URL.createObjectURL(cached);
        blobUrlRef.current = url;
        setBlobUrl(url);
        setPreviewLoading(false);
        return;
      }

      const blob = await pdf(pdfDoc).toBlob();
      if (cancelled) return;

      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);

      quotationPdfCache.set(previewKey, blob);

      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;
      setBlobUrl(url);
      setPreviewLoading(false);
    };

    generate();

    return () => {
      cancelled = true;
    };
  }, [open, pdfDoc, previewKey]);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

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

        <div className="flex-1 overflow-hidden border bg-muted/20 flex items-center justify-center">
          {previewLoading && (
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground font-medium">Generating PDF...</p>
            </div>
          )}
          {blobUrl && (
            <iframe
              src={blobUrl}
              style={{ width: "100%", height: "100%", border: "none" }}
              title="Quotation Preview"
            />
          )}
        </div>

        <div className="pt-4 flex justify-end">
          <PDFDownloadLink
            document={pdfDoc}
            fileName={`Quotation-${props.referenceNumber}.pdf`}
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