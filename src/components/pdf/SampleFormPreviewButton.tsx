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
import { SampleFormRecord } from "@/types/SampleForm";
import { getSampleFormById, saveSampleFormPdf } from "@/services/sampleFormService";
import { Loader2, AlertCircle } from "lucide-react";

interface Props {
  record: SampleFormRecord;
  autoOpen?: boolean;
}

export default function SampleFormPreviewButton({ record, autoOpen = false }: Props) {
  const [open, setOpen] = useState(autoOpen);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const blobRef = useRef<string | null>(null);
  const blobDataRef = useRef<Blob | null>(null);
  const referenceId = record.formId || record.sfid || record.id;

  // Guard: only run PDF generation after client fully mounts
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open || !mounted) return;
    if (blobUrl) return; // already generated

    setFetching(true);
    setFetchError(null);

    const generate = async () => {
      // 1. Fetch complete record from Firestore
      let fullRecord: SampleFormRecord = record;
      try {
        const fetched = await getSampleFormById(referenceId);
        if (fetched) fullRecord = fetched;
      } catch (err) {
        console.warn("Fallback to prop record:", err);
      }

      // 2. Dynamically import pdf renderer (avoids SSR bundling issues)
      const [{ pdf }, { SampleFormPDF }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./SampleFormPDF"),
      ]);

      // 3. Generate blob — cast through unknown to satisfy strict pdf() typing
      const { createElement } = await import("react");
      const element = createElement(SampleFormPDF, { record: fullRecord });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = await pdf(element as any).toBlob();

      // 4. Revoke old URL if any
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
      const url = URL.createObjectURL(blob);
      blobRef.current = url;
      blobDataRef.current = blob;
      setBlobUrl(url);
    };

    generate()
      .catch((err) => {
        console.error("PDF generation failed:", err);
        setFetchError("Failed to generate PDF preview. Please try again.");
      })
      .finally(() => setFetching(false));
  }, [open, mounted, referenceId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Revoke blob URL on unmount
  useEffect(() => {
    return () => { if (blobRef.current) URL.revokeObjectURL(blobRef.current); };
  }, []);

  const handleSave = async () => {
    if (!blobDataRef.current) return;
    setSaving(true);
    try {
      const buffer = await blobDataRef.current.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i += 1) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      const dataUrl = `data:application/pdf;base64,${base64}`;
      await saveSampleFormPdf(referenceId, dataUrl);
    } catch (err) {
      console.error("Failed to save PDF:", err);
      setFetchError("Failed to save PDF. Please try again.");
    } finally {
      setSaving(false);
    }
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

        <div className="flex-1 overflow-hidden flex items-center justify-center bg-muted/10">
          {fetching && (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground font-medium">Loading form data…</p>
            </div>
          )}
          {!fetching && fetchError && (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-amber-600">
              <AlertCircle className="h-6 w-6" />
              <p className="text-sm font-medium">{fetchError}</p>
            </div>
          )}
          {!fetching && fetchError && (
            <div className="flex flex-col items-center gap-2 text-destructive">
              <AlertCircle className="h-6 w-6" />
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

        <div className="px-6 py-4 border-t shrink-0 flex justify-end">
          <Button
            variant="secondary"
            disabled={fetching || !blobUrl || saving}
            onClick={handleSave}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving…
              </>
            ) : (
              "Save PDF"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
