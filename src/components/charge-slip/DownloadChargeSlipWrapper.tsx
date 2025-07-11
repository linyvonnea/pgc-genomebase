// src/components/charge-slip/DownloadChargeSlipWrapper.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { PDFDownloadLink, pdf } from "@react-pdf/renderer";
import { ChargeSlipPDF } from "@/components/charge-slip/ChargeSlipPDF";
import { SelectedService as StrictSelectedService } from "@/types/Quotation";
import { EditableSelectedService } from "@/types/SelectedService";
import { Client } from "@/types/Client";
import { Project } from "@/types/Project";
import { AdminInfo } from "@/types/Admin";
import { saveChargeSlipToFirestore } from "@/services/chargeSlipService";

interface Props {
  services: EditableSelectedService[];
  client: Client | null | undefined;
  project: Project | null | undefined;
  chargeSlipNumber: string;
  orNumber: string;
  useInternalPrice: boolean;
  preparedBy: AdminInfo;
  approvedBy: string; // Added approvedBy property
  dateIssued: string;
  subtotal: number;
  discount: number;
  total: number;
}

export default function DownloadChargeSlipWrapper({
  services,
  client,
  project,
  chargeSlipNumber,
  orNumber,
  useInternalPrice,
  preparedBy,
  referenceNumber,
  clientInfo,
  approvedBy, // Added approvedBy to destructuring
  dateIssued, // Added dateIssued to destructuring
  subtotal, // Added subtotal to destructuring
  discount, // Added discount to destructuring
  total, // Added total to destructuring
}: Props & { referenceNumber: string; clientInfo: { name: string; institution: string; designation: string; email: string } }) {
  const [open, setOpen] = useState(false);

  const cleanedServices: StrictSelectedService[] = services
    .filter((svc) => typeof svc.quantity === "number" && svc.quantity > 0)
    .map((svc) => ({ ...svc, quantity: svc.quantity as number }));

  const handleSaveAndDownload = async () => {
    try {
      // Ensure all required data is present
      if (!cleanedServices.length || !client || !project || !chargeSlipNumber) {
        console.error("Missing required data for generating charge slip.");
        return;
      }

      // Save the charge slip to Firestore
      const chargeSlipData = {
        id: "TEMP-ID", // Temporary ID, replace with actual logic if needed
        projectId: project.pid || "UNKNOWN_PROJECT_ID", // Provide fallback value for projectId
        services: cleanedServices,
        client,
        project,
        chargeSlipNumber,
        orNumber,
        useInternalPrice,
        preparedBy,
        referenceNumber,
        clientInfo,
        approvedBy,
        dateIssued,
        subtotal,
        discount,
        total,
      };

      await saveChargeSlipToFirestore(chargeSlipData);

      // Generate and download the PDF
      const pdfBlob = await pdf(
        <ChargeSlipPDF
          services={cleanedServices}
          client={client}
          project={project}
          chargeSlipNumber={chargeSlipNumber}
          orNumber={orNumber}
          useInternalPrice={useInternalPrice}
          preparedBy={preparedBy}
          referenceNumber={referenceNumber}
          clientInfo={clientInfo}
          approvedBy={approvedBy}
          dateIssued={dateIssued}
          subtotal={subtotal}
          discount={discount}
          total={total}
        />
      ).toBlob();

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${chargeSlipNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating or downloading charge slip:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">Preview Charge Slip</Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl p-4">
        <div className="h-[80vh] overflow-y-scroll bg-white">
          <ChargeSlipPDF
            services={cleanedServices}
            client={client}
            project={project}
            chargeSlipNumber={chargeSlipNumber}
            orNumber={orNumber}
            useInternalPrice={useInternalPrice}
            preparedBy={preparedBy}
            referenceNumber={referenceNumber}
            clientInfo={clientInfo}
            approvedBy={approvedBy} // Pass approvedBy to ChargeSlipPDF
            dateIssued={dateIssued} // Pass dateIssued to ChargeSlipPDF
            subtotal={subtotal} // Pass subtotal to ChargeSlipPDF
            discount={discount} // Pass discount to ChargeSlipPDF
            total={total} // Pass total to ChargeSlipPDF
          />
        </div>

        <PDFDownloadLink
          document={
            <ChargeSlipPDF
              services={cleanedServices}
              client={client}
              project={project}
              chargeSlipNumber={chargeSlipNumber}
              orNumber={orNumber}
              useInternalPrice={useInternalPrice}
              preparedBy={preparedBy}
              referenceNumber={referenceNumber}
              clientInfo={clientInfo}
              approvedBy={approvedBy} // Pass approvedBy to ChargeSlipPDF
              dateIssued={dateIssued} // Pass dateIssued to ChargeSlipPDF
              subtotal={subtotal} // Pass subtotal to ChargeSlipPDF
              discount={discount} // Pass discount to ChargeSlipPDF
              total={total} // Pass total to ChargeSlipPDF
            />
          }
          fileName={`${chargeSlipNumber}.pdf`}
        >
          {({ loading }) => (
            <Button disabled={loading} className="mt-4">
              {loading ? "Preparing..." : "Download Final PDF"}
            </Button>
          )}
        </PDFDownloadLink>

        <div className="pt-4 flex justify-end">
          <Button
            variant="default"
            onClick={handleSaveAndDownload}
            disabled={!cleanedServices.length || !client || !project || !chargeSlipNumber}
          >
            Generate Final Charge Slip
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}