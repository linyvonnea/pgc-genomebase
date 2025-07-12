"use client";

import { pdf } from "@react-pdf/renderer";
import { saveChargeSlipToFirestore } from "@/services/chargeSlipService";
import { ChargeSlipPDF } from "./ChargeSlipPDF";
import { SelectedService } from "@/types/SelectedService";
import { Client } from "@/types/Client";
import { Project } from "@/types/Project";
import { AdminInfo } from "@/types/Admin";

interface ChargeSlipPDFActionsProps {
  services: SelectedService[];
  client: Client;
  project: Project;
  chargeSlipNumber: string;
  orNumber: string;
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

// Default approver
const DEFAULT_APPROVER: AdminInfo = {
  name: "VICTOR MARCO EMMANUEL N. FERRIOLS, Ph.D.",
  position: "AED, PGC Visayas",
};

export default function ChargeSlipPDFActions({
  services,
  client,
  project,
  chargeSlipNumber,
  orNumber,
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
  const handleGenerateAndSave = async () => {
    try {
      const record = {
        id: chargeSlipNumber,
        chargeSlipNumber,
        projectId: project.pid!,
        client,
        project,
        services,
        orNumber,
        useInternalPrice,
        preparedBy,
        approvedBy,
        referenceNumber,
        clientInfo,
        dateIssued,
        subtotal,
        discount,
        total,
      };

      console.log("Saving charge slip to Firestore...");
      await saveChargeSlipToFirestore(record);
      console.log("Saved to Firestore ✅");

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
          dateIssued={dateIssued}
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
    } catch (err) {
      console.error("❌ Error saving or generating PDF:", err);
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