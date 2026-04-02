// src/components/pdf/SampleFormPreviewButton.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import dynamic from "next/dynamic";
import { SampleFormRecord } from "@/types/SampleForm";
import { getSampleFormById } from "@/services/sampleFormService";
import { Loader2, AlertCircle, Download } from "lucide-react";

// Dynamically import PDF components to avoid SSR issues — same pattern as SampleFormPDFPreview
const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Rendering PDF…</p>
      </div>
    ),
  }
);

const SampleFormPDF = dynamic(
  () => import("./SampleFormPDF").then((mod) => mod.SampleFormPDF),
  { ssr: false }
);

interface Props {
  record: SampleFormRecord;
  /** When true the dialog is opened immediately (for the /new preview page) */
  autoOpen?: boolean;
}

export default function SampleFormPreviewButton({ record, autoOpen = false }: Props) {
  const [open, setOpen] = useState(autoOpen);
  const [fullRecord, setFullRecord] = useState<SampleFormRecord | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const referenceId = record.formId || record.sfid || record.id;

  // When dialog opens, fetch the latest complete record from Firestore
  // so clientId, projectId, and all fields are guaranteed to be populated.
  useEffect(() => {
    if (!open) return;
    if (fullRecord) return; // already loaded

    setFetching(true);
    setFetchError(null);

    getSampleFormById(referenceId)
      .then((data) => {
        setFullRecord(data ?? record);
      })
      .catch((err) => {
        console.error("Failed to fetch sample form:", err);
        setFetchError("Could not load form data. Showing cached data.");
        setFullRecord(record); // fallback to prop
      })
      .finally(() => setFetching(false));
  }, [open, referenceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownload = async () => {
    const target = fullRecord ?? record;
    setDownloading(true);
    try {
      const { SampleFormPDF: PDFDoc } = await import("./SampleFormPDF");
      const { pdf: pdfFn } = await import("@react-pdf/renderer");
      const blob = await pdfFn(<PDFDoc record={target} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SampleForm-${referenceId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download PDF:", err);
    } finally {
      setDownloading(false);
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

        <div className="flex-1 overflow-hidden">
          {fetching && (
            <div className="flex flex-col items-center justify-center h-full gap-2">
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
          {!fetching && fullRecord && (
            <PDFViewer style={{ width: "100%", height: "100%", border: "none" }}>
              <SampleFormPDF record={fullRecord} />
            </PDFViewer>
          )}
        </div>

        <div className="px-6 py-4 border-t shrink-0 flex justify-end">
          <Button
            variant="secondary"
            disabled={fetching || !fullRecord || downloading}
            onClick={handleDownload}
          >
            {downloading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Preparing…
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
