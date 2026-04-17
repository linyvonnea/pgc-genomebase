"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getQuotationByReferenceNumber, updateQuotationStatus, getAllQuotations } from "@/services/quotationService";
import { QuotationRecord } from "@/types/Quotation";
import { notFound } from "next/navigation";
const DownloadButtonSection = dynamic(
  () => import("@/components/pdf/DownloadButtonSection"),
  { ssr: false, loading: () => <div className="text-sm text-muted-foreground py-2">Loading PDF tools...</div> }
);
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { logActivity } from "@/services/activityLogService";
import useAuth from "@/hooks/useAuth";

export default function QuotationDetailPageClient() {
  const { adminInfo } = useAuth();
  const { referenceNumber } = useParams();
  const router = useRouter();
  const [quotation, setQuotation] = useState<QuotationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<NonNullable<QuotationRecord["status"]>>("pending");
  const [savingStatus, setSavingStatus] = useState(false);
  const [allQuotations, setAllQuotations] = useState<QuotationRecord[]>([]);

  useEffect(() => {
    if (!referenceNumber || typeof referenceNumber !== "string") return;

    const fetchQuotation = async () => {
      try {
        const data = await getQuotationByReferenceNumber(referenceNumber);
        setQuotation(data);
        if (data) {
          // Determine initial status value for the dropdown
          let initialStatus: string = data.status || "pending";
          if (data.selectedForProject) {
            initialStatus = "selected";
          }
          setStatus(initialStatus as any);
        }
        
        // Log VIEW activity
        await logActivity({
          userId: adminInfo?.email || "system",
          userEmail: adminInfo?.email || "system@pgc.admin",
          userName: adminInfo?.name || "System",
          action: "VIEW",
          entityType: "quotation",
          entityId: referenceNumber,
          entityName: `Quotation ${referenceNumber}`,
          description: `Viewed quotation: ${referenceNumber}`,
        });
      } catch (err) {
        console.error("Error loading quotation:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuotation();
  }, [referenceNumber]);

  const handleStatusChange = async (newStatus: string) => {
    if (!referenceNumber || typeof referenceNumber !== "string" || !quotation) return;
    
    setSavingStatus(true);
    try {
      if (newStatus === "selected") {
        // Use the inquiryId as a placeholder for projectId if not already selected
        const projectId = quotation.selectedForProject || quotation.inquiryId || "MANUAL";
        await updateQuotationStatus(referenceNumber, "in-progress" as any);
        // Also update selectedForProject in Firestore if we want to mimic 'Selected'
        const { doc, setDoc, db } = await import("@/lib/firebase");
        const docRef = doc(db, "quotations", referenceNumber);
        await setDoc(docRef, { selectedForProject: projectId, status: "in-progress" }, { merge: true });
        
        setStatus("selected" as any);
        setQuotation({ ...quotation, selectedForProject: projectId, status: "in-progress" });
      } else {
        // For 'cancelled' or 'pending' (undoing selection)
        let firestoreStatus = newStatus;
        const updateData: any = { status: firestoreStatus };
        
        if (newStatus === "pending") {
          updateData.selectedForProject = null;
        }

        const { doc, setDoc, db } = await import("@/lib/firebase");
        const docRef = doc(db, "quotations", referenceNumber);
        await setDoc(docRef, updateData, { merge: true });
        
        setStatus(newStatus as any);
        setQuotation({ 
          ...quotation, 
          status: firestoreStatus as any,
          selectedForProject: newStatus === "pending" ? undefined : quotation.selectedForProject 
        });
      }

      await logActivity({
        userId: adminInfo?.email || "system",
        userEmail: adminInfo?.email || "system@pgc.admin",
        userName: adminInfo?.name || "System",
        action: "UPDATE",
        entityType: "quotation",
        entityId: referenceNumber,
        entityName: `Quotation ${referenceNumber}`,
        description: `Updated quotation status to "${newStatus}": ${referenceNumber}`,
      });
      toast.success(`Quotation marked as ${newStatus}.`);
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error("Failed to update status.");
    } finally {
      setSavingStatus(false);
    }
  };

  const handleToggleCancel = async () => {

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading quotation...</div>;
  if (!quotation) return notFound();

  const {
    name,
    email,
    institution,
    designation,
    services,
    isInternal,
    dateIssued,
    categories,
    subtotal,
    discount,
    total,
    preparedBy,
  } = quotation;

  const preparedByText =
    typeof preparedBy === "string"
      ? preparedBy
      : `${preparedBy?.name ?? "—"}, ${preparedBy?.position ?? ""}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50/50 to-blue-50/30 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#166FB5] to-[#4038AF] bg-clip-text text-transparent">
                Quotation Details
              </h1>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Reference No:</span>
                <Badge variant="outline" className="font-mono text-[#F69122] border-[#F69122]/30 bg-[#F69122]/5">
                  {referenceNumber}
                </Badge>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push("/admin/quotations")}
              className="hover:bg-slate-50 border-slate-200"
            >
              ← Back to List
            </Button>
          </div>
        </div>

        {/* Client Information Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-gradient-to-r from-[#F69122] to-[#B9273A] rounded-full"></div>
            Client Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Client</span>
                <span className="text-sm font-medium text-slate-800">{name}</span>
                <span className="text-xs text-slate-600">{email}</span>
              </div>

              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Institution</span>
                <span className="text-sm font-medium text-slate-800">{institution}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Designation</span>
                <span className="text-sm font-medium text-slate-800">{designation}</span>
              </div>

              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Date Issued</span>
                <span className="text-sm font-medium text-slate-800">
                  {new Date(dateIssued).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Categories</span>
              <div className="flex items-center gap-2 flex-wrap">
                {categories.map((cat) => (
                  <Badge
                    key={cat}
                    className="capitalize bg-gradient-to-r from-[#166FB5]/10 to-[#4038AF]/10 text-[#166FB5] border-[#166FB5]/20 hover:bg-[#166FB5]/20"
                  >
                    {cat}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Financial Summary Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-gradient-to-r from-[#912ABD] to-[#6E308E] rounded-full"></div>
            Financial Summary
          </h2>

          <div className="space-y-3">
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-slate-600">Subtotal</span>
              <span className="font-medium text-slate-800">₱{subtotal.toLocaleString()}</span>
            </div>

            {isInternal && (
              <div className="flex justify-between items-center py-2 bg-green-50/50 -mx-2 px-2 rounded-lg">
                <span className="text-sm text-green-700">Discount (12%)</span>
                <span className="font-medium text-green-700">-₱{discount.toLocaleString()}</span>
              </div>
            )}

            <div className="border-t border-slate-100 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-slate-800">Total</span>
                <span className="text-xl font-bold bg-gradient-to-r from-[#F69122] to-[#B9273A] bg-clip-text text-transparent">
                  ₱{total.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-r from-[#912ABD] to-[#6E308E] rounded-full"></div>
              Quotation Status
            </h2>
            {status === "cancelled" ? (
              <Badge className="bg-slate-100 text-slate-600 border border-slate-300 text-sm px-3 py-1">
                Cancelled
              </Badge>
            ) : status === "selected" ? (
              <Badge className="bg-green-50 text-green-700 border border-green-200 text-sm px-3 py-1">
                Selected
              </Badge>
            ) : (
              <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-sm px-3 py-1">
                Active
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-full max-w-xs">
              <Select
                value={status}
                onValueChange={handleStatusChange}
                disabled={savingStatus}
              >
                <SelectTrigger className="w-full bg-white border-slate-200">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Active (Pending)</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="selected">Selected</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {savingStatus && <span className="text-xs text-slate-400 animate-pulse">Saving…</span>}
          </div>
        </div>

        {/* Preparation Details Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-gradient-to-r from-[#4038AF] to-[#166FB5] rounded-full"></div>
            Preparation Details
          </h2>

          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Prepared By</span>
            <span className="text-sm font-medium text-slate-800">{preparedByText}</span>
          </div>
        </div>

        {/* PDF Generation Card */}
        <div className="bg-gradient-to-r from-[#F69122]/5 via-[#B9273A]/5 to-[#912ABD]/5 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
          <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <div className="w-2 h-2 bg-gradient-to-r from-[#F69122] to-[#912ABD] rounded-full"></div>
            Generate PDF Document
          </h2>
          <p className="text-sm text-slate-600 mb-4">Download the official quotation document</p>

          <DownloadButtonSection
            referenceNumber={referenceNumber as string}
            services={services}
            clientInfo={{ name, email, institution, designation }}
            useInternalPrice={isInternal}
            preparedBy={
              typeof preparedBy === "string"
                ? { name: preparedBy, position: "—" }
                : preparedBy
            }
            // ✅ pass Firestore numbers so PDF matches on migrated quotes
            subtotal={subtotal}
            discount={discount}
            total={total}
          />
        </div>

        {/* All Quotations */}
        {allQuotations.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-r from-[#166FB5] to-[#4038AF] rounded-full"></div>
              All Quotations
              <Badge variant="outline" className="ml-auto text-xs font-normal text-slate-500">
                {allQuotations.length} total
              </Badge>
            </h2>
            <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
              {allQuotations.map((q) => {
                const isCurrent = q.referenceNumber === referenceNumber;
                const isCancelled = q.status === "cancelled";
                return (
                  <div
                    key={q.referenceNumber}
                    onClick={() => !isCurrent && router.push(`/admin/quotations/${q.referenceNumber}`)}
                    className={[
                      "flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      isCurrent
                        ? "bg-blue-50 border border-blue-200 cursor-default"
                        : "hover:bg-slate-50 cursor-pointer border border-transparent",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={["font-mono font-semibold truncate text-xs", isCurrent ? "text-blue-700" : "text-slate-700"].join(" ")}>
                        {q.referenceNumber}
                      </span>
                      <span className="text-xs text-slate-500 truncate hidden sm:block">{q.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-slate-500">
                        {new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(q.total)}
                      </span>
                      {isCancelled ? (
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">Cancelled</span>
                      ) : isCurrent ? (
                        <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">Viewing</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}