// components/charge-slip/ChargeSlipPDFClientView.tsx
"use client";


import { normalizeDate } from "@/lib/formatters";

import { PDFViewer } from "@react-pdf/renderer";
import { ChargeSlipPDF } from "./ChargeSlipPDF";
import { ChargeSlipRecord } from "@/types/ChargeSlipRecord";

interface Props {
  record: ChargeSlipRecord;
}

export function ChargeSlipPDFClientView({ record }: Props) {
  return (
    <PDFViewer width="100%" height={600}>
      <ChargeSlipPDF
        services={record.services}
        client={record.client}
        project={record.project}
        chargeSlipNumber={record.chargeSlipNumber}
        orNumber={record.orNumber ?? ""}
        useInternalPrice={record.useInternalPrice}
        useAffiliationAsClientName={record.useAffiliationAsClientName}
        preparedBy={record.preparedBy}
        referenceNumber={record.referenceNumber}
        clientInfo={record.clientInfo}
        approvedBy={record.approvedBy}
        dateIssued={normalizeDate(record.dateIssued ?? "")}
        subtotal={record.subtotal}
        discount={record.discount}
        total={record.total}
      />
    </PDFViewer>
  );
}