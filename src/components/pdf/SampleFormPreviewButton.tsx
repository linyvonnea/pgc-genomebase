// src/components/pdf/SampleFormPreviewButton.tsx
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
import { SampleFormPDF } from "./SampleFormPDF";
import { SampleFormRecord } from "@/types/SampleForm";
import { Loader2 } from "lucide-react";

interface Props {
  record: SampleFormRecord;
  /** When true the dialog is opened immediately (for the /new preview page) */
  autoOpen?: boolean;
}

export default function SampleFormPreviewButton({ record, autoOpen = false }: Props) {
  const [open, setOpen] = useState(autoOpen);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const blobUrlRef = useRef<string | null>(null);

  // Generate a blob URL when the dialog opens — much faster than PDFViewer
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setBlobUrl(null);

    const generate = async () => {
      const blob = await pdf(<SampleFormPDF record={record} />).toBlob();
      if (cancelled) return;

      // Revoke any previous blob URL to free memory
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);

      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;
      setBlobUrl(url);
      setLoading(false);
    };

    generate().catch((err) => {
      console.error("Failed to generate PDF blob:", err);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, record]);

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `SampleForm-${record.sfid || record.formId || record.id}.pdf`;
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-blue-700 border-blue-200 hover:bg-blue-50">
          📄 Preview PDF
        </Button>
      </DialogTrigger>

      <DialogContent
        className="max-w-5xl w-full h-[90vh] flex flex-col"
        aria-describedby="sample-pdf-preview-desc"
      >
        <div id="sample-pdf-preview-desc" className="sr-only">
          Preview of the generated sample submission form PDF.
        </div>

        <DialogHeader>
          <DialogTitle>
            Sample Form Preview — {record.sfid || record.formId || record.id}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden border bg-muted/20 flex items-center justify-center rounded-md">
          {loading && (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground font-medium">Generating PDF…</p>
            </div>
          )}
          {blobUrl && (
            <iframe
              src={blobUrl}
              style={{ width: "100%", height: "100%", border: "none" }}
              title="Sample Form PDF Preview"
            />
          )}
        </div>

        <div className="pt-4 flex justify-end">
          <Button
            variant="secondary"
            disabled={loading || !blobUrl}
            onClick={handleDownload}
          >
            {loading ? "Preparing…" : "⬇ Download PDF"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
