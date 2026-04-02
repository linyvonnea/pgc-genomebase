"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { normalizeDate } from "@/lib/formatters";
import { PDFDownloadLink, pdf } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChargeSlipPDF } from "./ChargeSlipPDF";
import { ChargeSlipRecord } from "@/types/ChargeSlipRecord";
import { logActivity } from "@/services/activityLogService";
import useAuth from "@/hooks/useAuth";

export function ChargeSlipHistoryPDFPreview({ record }: { record: ChargeSlipRecord }) {
  const { adminInfo } = useAuth();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const blobUrlRef = useRef<string | null>(null);
  
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
  
  const pdfDoc = useMemo(
    () => (
      <ChargeSlipPDF
        services={record.services}
        client={record.client}
        project={record.project}
        chargeSlipNumber={record.chargeSlipNumber}
        orNumber={record.orNumber ?? ""}
        isInternal={record.useInternalPrice}
        useInternalPrice={record.useInternalPrice}
        useAffiliationAsClientName={record.useAffiliationAsClientName}
        preparedBy={record.preparedBy}
        referenceNumber={record.referenceNumber}
        clientInfo={record.clientInfo}
        approvedBy={record.approvedBy}
        dateIssued={normalizeDate(record.dateIssued)}
        subtotal={record.subtotal}
        discount={record.discount}
        total={record.total}
      />
    ),
    [record]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setBlobUrl(null);

    const generate = async () => {
      const blob = await pdf(pdfDoc).toBlob();
      if (cancelled) return;

      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);

      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;
      setBlobUrl(url);
      setLoading(false);
    };

    generate();

    return () => {
      cancelled = true;
    };
  }, [pdfDoc]);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col flex-1 h-[calc(90vh-56px)]">
      {/* PDF Viewer */}
      <div className="flex-1 overflow-hidden bg-muted/20 flex items-center justify-center">
        {loading && (
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground font-medium">Generating PDF...</p>
          </div>
        )}
        {blobUrl && (
          <iframe
            src={blobUrl}
            style={{ width: "100%", height: "100%", border: "none" }}
            title="Charge Slip Preview"
          />
        )}
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