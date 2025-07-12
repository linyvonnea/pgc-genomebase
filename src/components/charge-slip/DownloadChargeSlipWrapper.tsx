"use client";

import { pdf } from "@react-pdf/renderer";
import { saveChargeSlipToFirestore } from "@/services/chargeSlipService";
import { ChargeSlipPDF } from "./ChargeSlipPDF";
import { ChargeSlipRecord } from "@/types/ChargeSlipRecord";

interface Props {
  record: ChargeSlipRecord;
}

export default function DownloadChargeSlipWrapper({ record }: Props) {
  const handleDownload = async () => {
    try {
      // Save to Firestore
      await saveChargeSlipToFirestore(record);

      // Generate PDF blob
      const blob = await pdf(
        <ChargeSlipPDF
          services={record.services}
          client={record.client}
          project={record.project}
          chargeSlipNumber={record.chargeSlipNumber}
          orNumber={record.orNumber}
          useInternalPrice={record.useInternalPrice}
          preparedBy={record.preparedBy}
          approvedBy={record.approvedBy} // ✅ now passed as object, not string
          referenceNumber={record.referenceNumber}
          clientInfo={record.clientInfo}
          dateIssued={record.dateIssued}
          subtotal={record.subtotal}
          discount={record.discount}
          total={record.total}
        />
      ).toBlob();

      // Trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${record.chargeSlipNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download charge slip", err);
    }
  };

  return (
    <button
      onClick={handleDownload}
      className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
    >
      Generate Final Charge Slip
    </button>
  );
}