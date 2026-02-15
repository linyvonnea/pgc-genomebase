"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { PDFViewer } from "@react-pdf/renderer";
import { getQuotationByReferenceNumber } from "@/services/quotationService";
import { getChargeSlipById } from "@/services/chargeSlipService";
import { QuotationPDF } from "@/components/quotation/QuotationPDF";
import { ChargeSlipPDF } from "@/components/charge-slip/ChargeSlipPDF";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { normalizeDate } from "@/lib/formatters";

function ViewDocumentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const type = searchParams.get("type");
  const ref = searchParams.get("ref");
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!type || !ref) {
        toast.error("Invalid document parameters.");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        if (type === "quotation") {
          const quotation = await getQuotationByReferenceNumber(ref);
          if (quotation) {
            setData(quotation);
          } else {
            toast.error("Quotation not found.");
          }
        } else if (type === "charge-slip") {
          const chargeSlip = await getChargeSlipById(ref);
          if (chargeSlip) {
            setData(chargeSlip);
          } else {
            toast.error("Charge slip not found.");
          }
        }
      } catch (err) {
        console.error("Error fetching document:", err);
        toast.error("Failed to load document.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [type, ref]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#166FB5]" />
        <span className="ml-2">Loading document...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-slate-500">Document not found or error loading.</p>
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-slate-900 overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-4">
          <Button onClick={() => router.back()} variant="ghost" size="icon" className="text-white hover:bg-slate-700">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-white font-medium">
            {type === "quotation" ? "Quotation" : "Charge Slip"} - {ref}
          </h1>
        </div>
        <Button onClick={() => router.back()} variant="secondary" size="sm">
          Return
        </Button>
      </div>
      <div className="flex-1 overflow-hidden">
        <PDFViewer style={{ width: "100%", height: "100%", border: "none" }}>
          {type === "quotation" ? (
            <QuotationPDF 
              services={data.services}
              clientInfo={{
                name: data.name,
                institution: data.institution,
                designation: data.designation,
                email: data.email
              }}
              referenceNumber={data.referenceNumber}
              useInternalPrice={data.isInternal}
              preparedBy={data.preparedBy}
              totalsOverride={{
                subtotal: data.subtotal,
                discount: data.discount,
                total: data.total
              }}
              dateOfIssue={data.dateIssued}
              useAffiliationAsClientName={data.useAffiliationAsClientName}
            />
          ) : (
            <ChargeSlipPDF 
              services={data.services}
              client={data.client}
              project={data.project}
              chargeSlipNumber={data.chargeSlipNumber}
              orNumber={data.orNumber ?? ""}
              useInternalPrice={data.useInternalPrice}
              useAffiliationAsClientName={data.useAffiliationAsClientName}
              preparedBy={data.preparedBy}
              referenceNumber={data.referenceNumber}
              clientInfo={data.clientInfo}
              approvedBy={
                data.approvedBy || {
                  name: "VICTOR MARCO EMMANUEL N. FERRIOLS, Ph.D.",
                  position: "AED, PGC Visayas",
                }
              }
              dateIssued={normalizeDate(data.dateIssued ?? "")}
              subtotal={data.subtotal}
              discount={data.discount}
              total={data.total}
            />
          )}
        </PDFViewer>
      </div>
    </div>
  );
}

export default function ViewDocumentPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#166FB5]" />
      </div>
    }>
      <ViewDocumentContent />
    </Suspense>
  );
}
