"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import { QuotationPDF } from "@/components/quotation/QuotationPDF";
import { Button } from "@/components/ui/button";
import type { SelectedService } from "@/types/SelectedService";

interface Props {
  services: SelectedService[];
  clientInfo: {
    name: string;
    institution: string;
    designation: string;
    email: string;
  };
  referenceNumber: string;
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

export default function DownloadPDFLink(props: Props) {
  const { subtotal, discount, total } = props;
  const totalsOverride =
    typeof subtotal === "number" && typeof total === "number"
      ? { subtotal, discount: discount ?? 0, total }
      : undefined;

  return (
    <PDFDownloadLink
      document={<QuotationPDF {...props} totalsOverride={totalsOverride} />}
      fileName={`${props.referenceNumber}.pdf`}
    >
      {({ loading }) => (
        <Button variant="outline" disabled={loading}>
          {loading ? "Preparing PDF..." : "Download PDF"}
        </Button>
      )}
    </PDFDownloadLink>
  );
}