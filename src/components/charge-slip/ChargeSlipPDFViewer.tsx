// src/components/charge-slip/ChargeSlipPDFViewer.tsx
"use client";

import { useState, useEffect } from "react";
import { PDFViewer, pdf } from "@react-pdf/renderer";
import { ChargeSlipPDF } from "./ChargeSlipPDF";
import { ChargeSlipRecord } from "@/types/ChargeSlipRecord";
import { getClientById, getProjectById } from "@/services/clientProjectService";
import { saveChargeSlip } from "@/services/chargeSlipService";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { normalizeDate } from "@/lib/formatters";
import { sanitizeObject } from "@/lib/sanitizeObject";

interface Props {
  chargeSlip: ChargeSlipRecord;
}

export function ChargeSlipPDFViewer({ chargeSlip }: Props) {
  const [clientDetails, setClientDetails] = useState<string>("");
  const [projectDetails, setProjectDetails] = useState<string>("");

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        if (chargeSlip.client?.cid && chargeSlip.project?.pid) {
          const [client, project] = await Promise.all([
            getClientById(chargeSlip.client.cid),
            getProjectById(chargeSlip.project.pid),
          ]);

          if (client) {
            setClientDetails(`${client.name} (${client.affiliation || "N/A"})`);
          }

          if (project) {
            setProjectDetails(project.title || "N/A");
          }
        }
      } catch (error) {
        console.error("Failed to fetch client or project details", error);
        toast.error("Failed to fetch client or project details.");
      }
    };

    fetchDetails();
  }, [chargeSlip.client?.cid, chargeSlip.project?.pid]);

  const handleGenerateFinalChargeSlip = async () => {
    try {
      const sanitized = sanitizeObject(chargeSlip) as ChargeSlipRecord;
      await saveChargeSlip(sanitized);

      const blob = await pdf(
        <ChargeSlipPDF
          services={sanitized.services}
          client={sanitized.client}
          project={sanitized.project}
          chargeSlipNumber={sanitized.chargeSlipNumber}
          orNumber={sanitized.orNumber ?? ""}
          useInternalPrice={sanitized.useInternalPrice}
          useAffiliationAsClientName={sanitized.useAffiliationAsClientName}
          preparedBy={sanitized.preparedBy}
          referenceNumber={sanitized.referenceNumber}
          clientInfo={sanitized.clientInfo}
          approvedBy={
            sanitized.approvedBy || {
              name: "VICTOR MARCO EMMANUEL N. FERRIOLS, Ph.D.",
              position: "AED, PGC Visayas",
            }
          }
          dateIssued={normalizeDate(sanitized.dateIssued ?? "")}
          subtotal={sanitized.subtotal}
          discount={sanitized.discount}
          total={sanitized.total}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${sanitized.chargeSlipNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success("Charge slip generated successfully.");
    } catch (error) {
      console.error("Failed to generate charge slip", error);
      toast.error("Failed to generate charge slip.");
    }
  };

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">
        Build Charge Slip for: {clientDetails || "Loading..."} – {projectDetails || "Loading..."}
      </h1>

      <PDFViewer width="100%" height="600">
        <ChargeSlipPDF
          services={chargeSlip.services}
          client={chargeSlip.client}
          project={chargeSlip.project}
          chargeSlipNumber={chargeSlip.chargeSlipNumber}
          orNumber={chargeSlip.orNumber ?? ""}
          useInternalPrice={chargeSlip.useInternalPrice}
          useAffiliationAsClientName={chargeSlip.useAffiliationAsClientName}
          preparedBy={chargeSlip.preparedBy}
          referenceNumber={chargeSlip.referenceNumber}
          clientInfo={chargeSlip.clientInfo}
          approvedBy={
            chargeSlip.approvedBy || {
              name: "VICTOR MARCO EMMANUEL N. FERRIOLS, Ph.D.",
              position: "AED, PGC Visayas",
            }
          }
          dateIssued={normalizeDate(chargeSlip.dateIssued ?? "")}
          subtotal={chargeSlip.subtotal}
          discount={chargeSlip.discount}
          total={chargeSlip.total}
        />
      </PDFViewer>

      <Button onClick={handleGenerateFinalChargeSlip} className="mt-4">
        Generate Final Charge Slip
      </Button>
    </div>
  );
}