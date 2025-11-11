"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getQuotationByReferenceNumber } from "@/services/quotationService";
import { QuotationRecord } from "@/types/Quotation";
import { notFound } from "next/navigation";
import DownloadButtonSection from "@/components/pdf/DownloadButtonSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function QuotationDetailPageClient() {
  const { referenceNumber } = useParams();
  const router = useRouter();
  const [quotation, setQuotation] = useState<QuotationRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!referenceNumber || typeof referenceNumber !== "string") return;

    const fetchQuotation = async () => {
      try {
        const data = await getQuotationByReferenceNumber(referenceNumber);
        setQuotation(data);
      } catch (err) {
        console.error("Error loading quotation:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuotation();
  }, [referenceNumber]);

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
      </div>
    </div>
  );
}