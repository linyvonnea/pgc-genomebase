// src/components/pdf/SamplePDFViewer.tsx
"use client";

import dynamic from "next/dynamic";
import { SampleFormRecord } from "@/types/SampleForm";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { SampleFormPDF } from "./SampleFormPDF";
import { Loader2 } from "lucide-react";

// Dynamically imported to prevent SSR — @react-pdf/renderer uses browser APIs
const SampleQuotationPDFClient = dynamic(
  () => import("./SampleQuotationPDFClient"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[800px] bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    ),
  }
);

export function SamplePDFViewer({ record }: { record: SampleFormRecord }) {
  const pdfUrl = `/api/generate-sample-form-pdf/${record.sfid || record.formId || record.id}`;

  return (
    <div className="w-full">
      <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-end gap-2">
        <a
          href={pdfUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center px-3 py-1 rounded bg-blue-600 text-white text-sm"
        >
          Open PDF
        </a>
        <PDFDownloadLink
          document={<SampleFormPDF record={record} />}
          fileName={`sample_form_${record.sfid || record.formId || record.id}.pdf`}
        >
          {({ loading }) => (
            <button className="inline-flex items-center px-3 py-1 rounded border text-sm" disabled={loading}>
              {loading ? "Preparing..." : "Download (client)"}
            </button>
          )}
        </PDFDownloadLink>
        <button
          className="inline-flex items-center px-3 py-1 rounded border text-sm"
          onClick={() => {
            // open raw JSON in new tab for quick inspection
            const jsonWindow = window.open();
            if (jsonWindow) {
              jsonWindow.document.body.innerText = JSON.stringify(record, null, 2);
            }
          }}
        >
          Show JSON
        </button>
      </div>
      <SampleQuotationPDFClient record={record} />
    </div>
  );
}
