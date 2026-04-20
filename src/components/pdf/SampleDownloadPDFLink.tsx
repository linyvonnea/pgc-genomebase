"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { SampleFormPDF } from "./SampleFormPDF";
import { SampleFormRecord } from "@/types/SampleForm";

export default function SampleDownloadPDFLink({
  record,
}: {
  record: SampleFormRecord;
}) {
  const fileName = `sample_form_${record.sfid || record.formId || record.id}.pdf`;
  return (
    <PDFDownloadLink document={<SampleFormPDF record={record} />} fileName={fileName}>
      {({ loading }) => (
        <Button variant="outline" disabled={loading}>
          {loading ? "Preparing PDF..." : "Download PDF"}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
