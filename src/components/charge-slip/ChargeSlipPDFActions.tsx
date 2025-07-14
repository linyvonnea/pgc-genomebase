// src/components/charge-slip/ChargeSlipPDFActions.tsx
"use client";

import { pdf } from "@react-pdf/renderer";
import { saveChargeSlip } from "@/services/chargeSlipService";
import { ChargeSlipPDF } from "./ChargeSlipPDF";
import { SelectedService } from "@/types/SelectedService";
import { Client } from "@/types/Client";
import { Project } from "@/types/Project";
import { AdminInfo } from "@/types/Admin";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChargeSlipRecord } from "@/types/ChargeSlipRecord";
import { sanitizeObject } from "@/lib/sanitizeObject";
import { normalizeDate } from "@/lib/formatters";

interface ChargeSlipPDFActionsProps {
  services: SelectedService[];
  client: Client;
  project: Project;
  chargeSlipNumber: string;
  orNumber?: string;
  useInternalPrice: boolean;
  preparedBy: AdminInfo;
  referenceNumber: string;
  clientInfo: {
    name: string;
    institution: string;
    designation: string;
    email: string;
  };
  approvedBy?: AdminInfo;
  dateIssued: string;
  subtotal: number;
  discount: number;
  total: number;
}

// Fallback approver
const DEFAULT_APPROVER: AdminInfo = {
  name: "VICTOR MARCO EMMANUEL N. FERRIOLS, Ph.D.",
  position: "AED, PGC Visayas",
};

export default function ChargeSlipPDFActions({
  services,
  client,
  project,
  chargeSlipNumber,
  orNumber = "",
  useInternalPrice,
  preparedBy,
  referenceNumber,
  clientInfo,
  approvedBy = DEFAULT_APPROVER,
  dateIssued,
  subtotal,
  discount,
  total,
}: ChargeSlipPDFActionsProps) {
  const router = useRouter();

  const handleGenerateAndSave = async () => {
    try {
        const rawRecord: ChargeSlipRecord = {
        id: chargeSlipNumber,
        chargeSlipNumber,
        referenceNumber,
        projectId: project?.pid ?? "",
        cid: client?.cid ?? "",
        client,
        project,
        services,
        useInternalPrice,
        preparedBy,
        approvedBy,
        clientInfo,
        orNumber,
        dateIssued,
        subtotal,
        discount,
        total,

        // Add this line to prevent `undefined` error
        dateOfOR: null,
        };

      const sanitized = sanitizeObject(rawRecord) as ChargeSlipRecord;
      await saveChargeSlip(sanitized);

      const blob = await pdf(
        <ChargeSlipPDF
          services={services}
          client={client}
          project={project}
          chargeSlipNumber={chargeSlipNumber}
          orNumber={orNumber}
          useInternalPrice={useInternalPrice}
          preparedBy={preparedBy}
          approvedBy={approvedBy}
          referenceNumber={referenceNumber}
          clientInfo={clientInfo}
          dateIssued={normalizeDate(dateIssued)}
          subtotal={subtotal}
          discount={discount}
          total={total}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${chargeSlipNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success("Charge slip saved and downloaded successfully!");

      setTimeout(() => {
        router.push("/admin/charge-slips");
      }, 1000);
    } catch (err) {
      console.error("❌ Error saving or generating PDF:", err);
      toast.error("Failed to save charge slip. Please try again.");
    }
  };

  return (
    <button
      onClick={handleGenerateAndSave}
      className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
    >
      Generate Final Charge Slip
    </button>
  );
}