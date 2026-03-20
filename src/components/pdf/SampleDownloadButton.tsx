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
import { PDFViewer, PDFDownloadLink } from "@react-pdf/renderer";
import { SampleFormPDF } from "./SampleFormPDF";
import { SampleFormRecord } from "@/types/SampleForm";

export default function SampleDownloadButton({ record }: { record: SampleFormRecord }) {
  const [open, setOpen] = useState(false);
  const fileName = `sample_form_${record.sfid || record.formId || record.id}.pdf`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">📄 Preview PDF</Button>
      </DialogTrigger>

      <DialogContent className="max-w-5xl w-full h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Sample Form Preview</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden border">
          <PDFViewer style={{ width: "100%", height: "100%", border: "none" }}>
            <SampleFormPDF record={record} />
          </PDFViewer>
        </div>

        <div className="pt-4 flex justify-end">
          <PDFDownloadLink document={<SampleFormPDF record={record} />} fileName={fileName}>
            {({ loading }) => (
              <Button disabled={loading} variant="secondary">
                {loading ? "Preparing..." : "⬇ Download PDF"}
              </Button>
            )}
          </PDFDownloadLink>
        </div>
      </DialogContent>
    </Dialog>
  );
}
