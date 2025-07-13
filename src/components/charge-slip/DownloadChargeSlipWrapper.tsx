// src/components/charge-slip/DownloadChargeSlipWrapper.tsx
"use client";

import { normalizeDate } from "@/lib/formatters";

import { pdf } from "@react-pdf/renderer";
import { saveChargeSlip } from "@/services/chargeSlipService";
import { ChargeSlipPDF } from "./ChargeSlipPDF";
import { ChargeSlipRecord } from "@/types/ChargeSlipRecord";

interface Props {
  record: ChargeSlipRecord;
}

export default function DownloadChargeSlipWrapper({ record }: Props) {
  const handleDownload = async () => {
    try {
      // Optional: Save to Firestore before downloading
      await saveChargeSlip(record);

      // Generate PDF as blob using @react-pdf/renderer
      const blob = await pdf(
        <ChargeSlipPDF
          services={record.services}
          client={record.client}
          project={record.project}
          chargeSlipNumber={record.chargeSlipNumber}
          orNumber={record.orNumber ?? ""}
          useInternalPrice={record.useInternalPrice}
          preparedBy={record.preparedBy}
          approvedBy={record.approvedBy}
          referenceNumber={record.referenceNumber}
          clientInfo={record.clientInfo}
          dateIssued={normalizeDate(record.dateIssued ?? "")}
          subtotal={record.subtotal}
          discount={record.discount}
          total={record.total}
        />
      ).toBlob();

      // Create a temporary download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${record.chargeSlipNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("❌ Failed to generate or download charge slip:", error);
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