"use client";


import { normalizeDate } from "@/lib/formatters";
import { PDFViewer } from "@react-pdf/renderer";
import { ChargeSlipPDF } from "./ChargeSlipPDF";
import { ChargeSlipRecord } from "@/types/ChargeSlipRecord";

interface Props {
  chargeSlip: ChargeSlipRecord;
}

export default function ChargeSlipPDFClient({ chargeSlip }: Props) {
  return (
    <PDFViewer width="100%" height="600">
      <ChargeSlipPDF
        chargeSlipNumber={chargeSlip.chargeSlipNumber}
        referenceNumber={chargeSlip.referenceNumber}
        services={chargeSlip.services}
        client={chargeSlip.client}
        project={chargeSlip.project}
        orNumber={chargeSlip.orNumber ?? ""}
        useInternalPrice={chargeSlip.useInternalPrice}
        dateIssued={normalizeDate(chargeSlip.dateIssued)}
        subtotal={chargeSlip.subtotal}
        discount={chargeSlip.discount}
        total={chargeSlip.total}
        preparedBy={chargeSlip.preparedBy}
        approvedBy={
          chargeSlip.approvedBy || {
            name: "VICTOR MARCO EMMANUEL N. FERRIOLS, Ph.D",
            position: "AED, PGC Visayas",
          }
        }
        clientInfo={{
          name: chargeSlip.clientInfo?.name || "",
          institution: chargeSlip.clientInfo?.institution || "",
          designation: chargeSlip.clientInfo?.designation || "",
          email: chargeSlip.clientInfo?.email || "",
        }}
      />
    </PDFViewer>
  );
}