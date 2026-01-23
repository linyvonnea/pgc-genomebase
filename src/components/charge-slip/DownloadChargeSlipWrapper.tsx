// src/components/charge-slip/DownloadChargeSlipWrapper.tsx
"use client";

import { normalizeDate } from "@/lib/formatters";
import { sanitizeObject } from "@/lib/sanitizeObject";

import { pdf } from "@react-pdf/renderer";
import { saveChargeSlip } from "@/services/chargeSlipService";
import { ChargeSlipPDF } from "./ChargeSlipPDF";
import { ChargeSlipRecord } from "@/types/ChargeSlipRecord";
import { logActivity } from "@/services/activityLogService";
import useAuth from "@/hooks/useAuth";

interface Props {
  record: ChargeSlipRecord;
}

export default function DownloadChargeSlipWrapper({ record }: Props) {
  const { adminInfo } = useAuth();
  const handleDownload = async () => {
    try {
      // Sanitize before saving to Firestore
      const sanitizedRecord = sanitizeObject(record) as ChargeSlipRecord;
      await saveChargeSlip(sanitizedRecord);

      // Generate PDF from sanitized data
      const blob = await pdf(
        <ChargeSlipPDF
          services={sanitizedRecord.services}
          client={sanitizedRecord.client}
          project={sanitizedRecord.project}
          chargeSlipNumber={sanitizedRecord.chargeSlipNumber}
          orNumber={sanitizedRecord.orNumber ?? ""}
          useInternalPrice={sanitizedRecord.useInternalPrice}
          preparedBy={sanitizedRecord.preparedBy}
          approvedBy={sanitizedRecord.approvedBy}
          referenceNumber={sanitizedRecord.referenceNumber}
          clientInfo={sanitizedRecord.clientInfo}
          dateIssued={normalizeDate(sanitizedRecord.dateIssued ?? "")}
          subtotal={sanitizedRecord.subtotal}
          discount={sanitizedRecord.discount}
          total={sanitizedRecord.total}
        />
      ).toBlob();

      // Trigger PDF download
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${sanitizedRecord.chargeSlipNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      
      // Log the download activity
      await logActivity({
        userId: adminInfo?.email || "system",
        userEmail: adminInfo?.email || "system@pgc.admin",
        userName: adminInfo?.name || "System",
        action: "DOWNLOAD",
        entityType: "charge_slip",
        entityId: sanitizedRecord.referenceNumber || sanitizedRecord.chargeSlipNumber,
        entityName: `Charge Slip ${sanitizedRecord.chargeSlipNumber}`,
        description: `Downloaded charge slip PDF: ${sanitizedRecord.chargeSlipNumber}`,
      });
    } catch (error) {
      console.error("Failed to generate or download charge slip:", error);
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