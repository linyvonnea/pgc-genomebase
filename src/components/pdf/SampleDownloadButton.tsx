"use client";

import { useState, useEffect, useRef, createElement } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SampleFormRecord } from "@/types/SampleForm";
import { Loader2, AlertCircle } from "lucide-react";

export default function SampleDownloadButton({ record }: { record: SampleFormRecord }) {
  const [open, setOpen] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const blobRef = useRef<string | null>(null);
  const referenceId = record.sfid || record.formId || record.id;
  const fileName = `sample_form_${referenceId}.pdf`;

  // Guard: only run PDF generation after client fully mounts
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open || !mounted) return;
    if (blobUrl) return; // already generated

    setFetching(true);
    setFetchError(null);

    const generate = async () => {
      // Dynamically import pdf renderer (avoids SSR bundling issues)
      const [{ pdf }, { SampleFormPDF }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./SampleFormPDF"),
      ]);

      console.log("Generating Preview PDF for:", referenceId);
      const element = createElement(SampleFormPDF, { record });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = await pdf(element as any).toBlob();
      console.log("Blob generated:", blob.size, "bytes");

      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
      const url = URL.createObjectURL(blob);
      blobRef.current = url;
      setBlobUrl(url);
    };

    generate()
      .catch((err) => {
        console.error("PDF generation failed:", err);
        setFetchError("Failed to generate PDF preview. Please try again.");
      })
      .finally(() => setFetching(false));
  }, [open, mounted, record, referenceId]);

  // Cleanup on unmount or close
  useEffect(() => {
    return () => { if (blobRef.current) URL.revokeObjectURL(blobRef.current); };
  }, []);

  useEffect(() => {
    if (!open) {
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
      blobRef.current = null;
      setBlobUrl(null);
      setFetchError(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">📄 Preview PDF</Button>
      </DialogTrigger>

      <DialogContent className="max-w-5xl w-full h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>Sample Form Preview — {referenceId}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex items-center justify-center bg-muted/10 relative">
          {fetching && (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground font-medium">Preparing PDF…</p>
            </div>
          )}
          {!fetching && fetchError && (
            <div className="flex flex-col items-center gap-2 text-amber-600 p-8 text-center">
              <AlertCircle className="h-10 w-10" />
              <p className="text-sm font-medium">{fetchError}</p>
            </div>
          )}
          {!fetching && blobUrl && (
            <iframe
              src={blobUrl}
              style={{ width: "100%", height: "100%", border: "none" }}
              title={`Sample Form PDF — ${referenceId}`}
            />
          )}
        </div>

        <div className="px-6 py-4 border-t shrink-0 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          {blobUrl && (
            <Button asChild variant="secondary">
              <a href={blobUrl} download={fileName}>
                ⬇ Download PDF
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
