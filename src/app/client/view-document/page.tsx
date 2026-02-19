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
import useAuth from "@/hooks/useAuth";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

function ViewDocumentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isAdmin, loading: authLoading } = useAuth();
  
  const type = searchParams.get("type");
  const ref = searchParams.get("ref");
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      // Wait for auth to be determined
      if (authLoading) return;
      
      if (!user) {
        toast.error("You must be logged in to view documents.");
        setLoading(false);
        return;
      }

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
            // Verify ownership: Admin can view any, user can only view their own
            if (!isAdmin) {
              const userEmail = user.email?.toLowerCase();
              // QuotationRecord has email directly
              const quoteEmail = (quotation as any).email?.toLowerCase();
              
              // 1. Check direct email match
              let hasAccess = userEmail === quoteEmail;
              
              // 2. Check team membership via inquiryId
              const inquiryId = (quotation as any).inquiryId;
              if (!hasAccess && inquiryId) {
                // Check if user is a member of this inquiry in 'clients' collection
                const clientQuery = query(
                  collection(db, "clients"),
                  where("inquiryId", "==", inquiryId),
                  where("email", "==", user.email)
                );
                const clientSnap = await getDocs(clientQuery);
                if (!clientSnap.empty) {
                  hasAccess = true;
                } else {
                  // Final check: Is it the original contact person email on the inquiry?
                  const inquirySnap = await getDoc(doc(db, "inquiries", inquiryId));
                  if (inquirySnap.exists()) {
                    const inquiryData = inquirySnap.data();
                    if (inquiryData.email?.toLowerCase() === userEmail) {
                      hasAccess = true;
                    }
                  }
                }
              }
              
              if (!hasAccess) {
                toast.error("Access denied. This document does not belong to you.");
                router.push("/client");
                return;
              }
            }
            setData(quotation);
          } else {
            toast.error("Quotation not found.");
          }
        } else if (type === "charge-slip") {
          const chargeSlip = await getChargeSlipById(ref);
          if (chargeSlip) {
            // Verify ownership: Admin can view any, user can only view their own
            if (!isAdmin) {
              const userEmail = user.email?.toLowerCase();
              // ChargeSlipRecord has clientInfo.email or cid
              const slipEmail = (chargeSlip as any).clientInfo?.email?.toLowerCase() || (chargeSlip as any).cid?.toLowerCase();
              
              // 1. Check direct email match
              let hasAccess = userEmail === slipEmail;
              
              // 2. Check team membership via projectId/inquiryId
              if (!hasAccess) {
                const iidRaw = (chargeSlip as any).inquiryId || (chargeSlip as any).project?.iid;
                const inquiryIds = Array.isArray(iidRaw) ? iidRaw.filter(Boolean) : (iidRaw ? [iidRaw] : []);
                
                if (inquiryIds.length > 0) {
                  // Check clients collection for any of the inquiry IDs
                  // Firestore 'in' query works for up to 30 elements
                  const clientQuery = query(
                    collection(db, "clients"),
                    where("inquiryId", "in", inquiryIds.slice(0, 30)),
                    where("email", "==", user.email)
                  );
                  const clientSnap = await getDocs(clientQuery);
                  if (!clientSnap.empty) {
                    hasAccess = true;
                  } else {
                    // Also check inquiries collection for each ID (limited to first for simplicity or loop)
                    for (const inquiryId of inquiryIds.slice(0, 5)) { // Limit to 5 for fast response
                      const inquirySnap = await getDoc(doc(db, "inquiries", inquiryId));
                      if (inquirySnap.exists()) {
                        const inquiryData = inquirySnap.data();
                        if (inquiryData.email?.toLowerCase() === userEmail) {
                          hasAccess = true;
                          break;
                        }
                      }
                    }
                  }
                }
              }
              
              if (!hasAccess) {
                toast.error("Access denied. This document does not belong to you.");
                router.push("/client");
                return;
              }
            }
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
  }, [type, ref, user, isAdmin, authLoading, router]);

  if (loading || authLoading) {
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
