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
  const referenceId = record.formId || record.sfid || record.id;
  const pdfUrl = `/api/generate-sample-form-pdf/${encodeURIComponent(referenceId)}`;

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
          <iframe
            src={pdfUrl}
            style={{ width: "100%", height: "100%", border: "none" }}
            title={`Sample Form PDF Preview — ${referenceId}`}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
