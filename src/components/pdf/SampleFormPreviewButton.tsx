// src/components/pdf/SampleFormPreviewButton.tsx
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
import { SampleFormRecord } from "@/types/SampleForm";

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
  const referenceId = record.formId || record.sfid || record.id;

  // Generate a blob URL when the dialog opens — client-side with @react-pdf/renderer
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setBlobUrl(null);

    const generate = async () => {
      const blob = await pdf(<SampleFormPDF record={record} />).toBlob();
      if (cancelled) return;

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

    return () => { cancelled = true; };
  }, [open, record]);

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => { if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current); };
  }, []);

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `SampleForm-${referenceId}.pdf`;
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
        className="max-w-5xl w-full h-[90vh] flex flex-col p-0 gap-0"
        aria-describedby="sample-pdf-preview-desc"
      >
        <div id="sample-pdf-preview-desc" className="sr-only">
          Preview of the generated sample submission form PDF.
        </div>

        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>{referenceId}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden border-0 bg-muted/20 flex items-center justify-center">
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
              title={`Sample Form PDF Preview — ${referenceId}`}
            />
          )}
        </div>

        <div className="px-6 py-4 border-t shrink-0 flex justify-end">
          <Button variant="secondary" disabled={loading || !blobUrl} onClick={handleDownload}>
            {loading ? "Preparing…" : "⬇ Download PDF"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
