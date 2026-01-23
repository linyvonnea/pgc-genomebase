"use client";


import { normalizeDate } from "@/lib/formatters";
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChargeSlipPDF } from "./ChargeSlipPDF";
import { ChargeSlipRecord } from "@/types/ChargeSlipRecord";
import { logActivity } from "@/services/activityLogService";
import useAuth from "@/hooks/useAuth";

export function ChargeSlipHistoryPDFPreview({ record }: { record: ChargeSlipRecord }) {
  const { adminInfo } = useAuth();
  
  const handleDownload = async () => {
    // Log DOWNLOAD activity
    await logActivity({
      userId: adminInfo?.email || "system",
      userEmail: adminInfo?.email || "system@pgc.admin",
      userName: adminInfo?.name || "System",
      action: "DOWNLOAD",
      entityType: "charge_slip",
      entityId: record.referenceNumber || record.chargeSlipNumber,
      entityName: `Charge Slip ${record.chargeSlipNumber}`,
      description: `Downloaded charge slip PDF: ${record.chargeSlipNumber}`,
    });
  };
  
  const pdfDoc = (
    <ChargeSlipPDF
      services={record.services}
      client={record.client}
      project={record.project}
      chargeSlipNumber={record.chargeSlipNumber}
      orNumber={record.orNumber ?? ""}
      useInternalPrice={record.useInternalPrice}
      preparedBy={record.preparedBy}
      referenceNumber={record.referenceNumber}
      clientInfo={record.clientInfo}
      approvedBy={record.approvedBy}
      dateIssued={normalizeDate(record.dateIssued)}
      subtotal={record.subtotal}
      discount={record.discount}
      total={record.total}
    />
  );

  return (
    <div className="flex flex-col flex-1 h-[calc(90vh-56px)]">
      {/* PDF Viewer */}
      <div className="flex-1 overflow-hidden">
        <PDFViewer width="100%" height="100%" className="!m-0 !p-0">
          {pdfDoc}
        </PDFViewer>
      </div>

      <Separator className="my-4" />

      <div className="text-right px-4 pb-4">
        <PDFDownloadLink
          document={pdfDoc}
          fileName={`${record.chargeSlipNumber}.pdf`}
        >
          {({ loading }) => (
            <Button 
              disabled={loading}
              onClick={handleDownload}
            >
              {loading ? "Preparing PDF..." : "Download Final PDF"}
            </Button>
          )}
        </PDFDownloadLink>
      </div>
    </div>
  );
}