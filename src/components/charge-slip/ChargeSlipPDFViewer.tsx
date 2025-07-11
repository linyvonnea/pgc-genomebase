// src/components/charge-slip/ChargeSlipPDFViewer.tsx
"use client";

import { PDFViewer, pdf } from "@react-pdf/renderer";
import { ChargeSlipPDF } from "./ChargeSlipPDF";
import { ChargeSlipRecord } from "@/types/ChargeSlipRecord";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { getClientById, getProjectById } from "@/services/clientProjectService";
import { saveChargeSlipToFirestore } from "@/services/chargeSlipService";

export function ChargeSlipPDFViewer({ chargeSlip }: { chargeSlip: ChargeSlipRecord }) {
  const [clientDetails, setClientDetails] = useState<string>("");
  const [projectDetails, setProjectDetails] = useState<string>("");

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        console.log("chargeSlip object:", chargeSlip); // Debugging log

        if (chargeSlip.client?.cid && chargeSlip.project?.pid) {
          const client = await getClientById(chargeSlip.client.cid);
          const project = await getProjectById(chargeSlip.project.pid);

          if (client) {
            console.log("Fetched client details:", client); // Debugging log
            setClientDetails(`${client.name} (${client.affiliation || "N/A"})`);
          } else {
            console.warn("Client not found for CID:", chargeSlip.client.cid); // Warning log
          }

          if (project) {
            console.log("Fetched project details:", project); // Debugging log
            setProjectDetails(project.title || "N/A");
          } else {
            console.warn("Project not found for PID:", chargeSlip.project.pid); // Warning log
          }
        } else {
          console.warn("Missing client.cid or project.pid in chargeSlip:", chargeSlip); // Warning log
        }
      } catch (error) {
        console.error("Failed to fetch client or project details", error);
      }
    };

    fetchDetails();
  }, [chargeSlip.client?.cid, chargeSlip.project?.pid]);

  const formattedDateIssued = format(new Date(chargeSlip.dateIssued), "MMMM dd, yyyy");

  const handleGenerateFinalChargeSlip = async () => {
    try {
      // Save charge slip to Firestore
      await saveChargeSlipToFirestore(chargeSlip);

      // Generate and download the PDF
      const blob = await pdf(
        <ChargeSlipPDF
          services={chargeSlip.services}
          client={chargeSlip.client}
          project={chargeSlip.project}
          chargeSlipNumber={chargeSlip.chargeSlipNumber}
          orNumber={chargeSlip.orNumber}
          useInternalPrice={chargeSlip.useInternalPrice}
          preparedBy={chargeSlip.preparedBy}
          referenceNumber={chargeSlip.referenceNumber}
          clientInfo={chargeSlip.clientInfo}
          approvedBy={chargeSlip.approvedBy}
          dateIssued={format(new Date(chargeSlip.dateIssued), "MMMM dd, yyyy")}
          subtotal={chargeSlip.subtotal}
          discount={chargeSlip.discount}
          total={chargeSlip.total}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${chargeSlip.chargeSlipNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to generate final charge slip", error);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">
        Build Charge Slip for: {clientDetails} – {projectDetails}
      </h1>
      <PDFViewer width="100%" height="600">
        <ChargeSlipPDF
          services={chargeSlip.services}
          client={chargeSlip.client}
          project={chargeSlip.project}
          chargeSlipNumber={chargeSlip.chargeSlipNumber}
          orNumber={chargeSlip.orNumber}
          useInternalPrice={chargeSlip.useInternalPrice}
          preparedBy={chargeSlip.preparedBy}
          referenceNumber={chargeSlip.referenceNumber}
          clientInfo={chargeSlip.clientInfo}
          approvedBy={chargeSlip.approvedBy}
          dateIssued={formattedDateIssued}
          subtotal={chargeSlip.subtotal}
          discount={chargeSlip.discount}
          total={chargeSlip.total}
        />
      </PDFViewer>
      <button
        onClick={handleGenerateFinalChargeSlip}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Generate Final Charge Slip
      </button>
    </div>
  );
}
