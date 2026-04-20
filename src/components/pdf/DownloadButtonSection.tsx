"use client";

// NOTE: This file is loaded client-side only (via dynamic import with ssr:false in QuotationDetailPageClient).
// @react-pdf/renderer APIs are safe to use here without SSR guards.

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { SelectedService } from "@/types/SelectedService";
import { QuotationPDF } from "@/components/quotation/QuotationPDF";
import { PDFViewer, PDFDownloadLink } from "@react-pdf/renderer";
import { logActivity } from "@/services/activityLogService";
import useAuth from "@/hooks/useAuth";

interface Props {
  referenceNumber: string;
  services: SelectedService[];
  clientInfo: {
    name: string;
    institution: string;
    designation: string;
    email: string;
  };
  useInternalPrice: boolean;
  preparedBy: {
    name: string;
    position: string;
  };
  /** Optional overrides (from Firestore) for migrated quotes */
  subtotal?: number;
  discount?: number;
  total?: number;
}

export default function DownloadButtonSection(props: Props) {
  const { adminInfo } = useAuth();
  const [open, setOpen] = useState(false);

  const {
    referenceNumber,
    services,
    clientInfo,
    useInternalPrice,
    preparedBy,
    subtotal,
    discount,
    total,
  } = props;

  const totalsOverride = useMemo(
    () =>
      typeof subtotal === "number" && typeof total === "number"
        ? { subtotal, discount: discount ?? 0, total }
        : undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [subtotal, discount, total]
  );

  // Stable serialised keys prevent pdfDoc from being recreated on every parent re-render.
  const servicesKey = JSON.stringify(services);
  const clientInfoKey = JSON.stringify(clientInfo);
  const preparedByKey = JSON.stringify(preparedBy);
  const totalsKey = JSON.stringify(totalsOverride);

  const pdfDoc = useMemo(
    () => (
      <QuotationPDF
        referenceNumber={referenceNumber}
        services={services}
        clientInfo={clientInfo}
        useInternalPrice={useInternalPrice}
        preparedBy={preparedBy}
        totalsOverride={totalsOverride}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [referenceNumber, servicesKey, clientInfoKey, useInternalPrice, preparedByKey, totalsKey]
  );

  const handleDownload = async () => {
    await logActivity({
      userId: adminInfo?.email || "system",
      userEmail: adminInfo?.email || "system@pgc.admin",
      userName: adminInfo?.name || "System",
      action: "DOWNLOAD",
      entityType: "quotation",
      entityId: referenceNumber,
      entityName: `Quotation ${referenceNumber}`,
      description: `Downloaded quotation PDF: ${referenceNumber}`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">
          📄 Preview Quotation
        </Button>
      </DialogTrigger>

      <DialogContent
        className="max-w-5xl w-full h-[90vh] flex flex-col p-0"
        aria-describedby="pdf-preview-desc"
      >
        <div id="pdf-preview-desc" className="sr-only">
          Preview of the generated quotation PDF.
        </div>

        <DialogHeader className="px-6 pt-5 pb-2 shrink-0">
          <DialogTitle>Quotation Preview</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden px-6 min-h-0">
          {open && (
            <PDFViewer
              width="100%"
              height="100%"
              style={{ border: "1px solid #e2e8f0", borderRadius: "6px" }}
            >
              {pdfDoc}
            </PDFViewer>
          )}
        </div>

        <div className="px-6 pb-5 pt-3 flex justify-end shrink-0">
          <PDFDownloadLink
            document={pdfDoc}
            fileName={`Quotation-${referenceNumber}.pdf`}
          >
            {({ loading }) => (
              <Button
                disabled={loading}
                variant="secondary"
                onClick={handleDownload}
              >
                {loading ? "Preparing…" : "⬇ Download PDF"}
              </Button>
            )}
          </PDFDownloadLink>
        </div>
      </DialogContent>
    </Dialog>
  );
}