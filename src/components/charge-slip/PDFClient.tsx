// src/components/charge-slip/PDFClient.tsx
"use client";

import { PDFViewer } from "@react-pdf/renderer";
import { ChargeSlipPDF } from "./ChargeSlipPDF";
import { ChargeSlipRecord } from "@/types/ChargeSlipRecord";

export default function ChargeSlipPDFClient({
  chargeSlip,
}: {
  chargeSlip: ChargeSlipRecord;
}) {
  return (
    <PDFViewer width="100%" height="600">
      <ChargeSlipPDF
        referenceNumber={chargeSlip.chargeSlipNumber}
        services={chargeSlip.services}
        clientInfo={{
          name: chargeSlip.clientInfo.name || "",
          institution: chargeSlip.clientInfo.institution || "",
          designation: chargeSlip.clientInfo.designation || "",
          email: chargeSlip.clientInfo.email || "",
        }}
        useInternalPrice={chargeSlip.useInternalPrice}
        preparedBy={chargeSlip.preparedBy}
        approvedBy={chargeSlip.approvedBy} // Pass as a string
        orNumber={chargeSlip.orNumber}
        project={{
          title: chargeSlip.project.title,
          pid: chargeSlip.project.pid,
          year: chargeSlip.project.year,
        }}
        dateIssued={chargeSlip.dateIssued}
        subtotal={chargeSlip.subtotal}
        discount={chargeSlip.discount}
        total={chargeSlip.total}
        client={chargeSlip.client}
        chargeSlipNumber={chargeSlip.chargeSlipNumber}
      />
    </PDFViewer>
  );
}