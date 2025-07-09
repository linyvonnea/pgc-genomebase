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

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quotation Details</h1>
          <p className="text-muted-foreground">Reference No: <span className="font-medium">{referenceNumber}</span></p>
        </div>
        <Button variant="outline" onClick={() => router.push("/admin/quotations")}>
          ← Back to List
        </Button>
      </div>

      {/* Detail Section */}
      <div className="rounded-md border bg-white shadow-sm p-6 space-y-4 text-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><span className="text-muted-foreground">Prepared By:</span> <strong>{preparedBy || "—"}</strong></div>
          <div><span className="text-muted-foreground">Date Issued:</span> {new Date(dateIssued).toLocaleDateString()}</div>
          <div><span className="text-muted-foreground">Client:</span> {name} ({email})</div>
          <div><span className="text-muted-foreground">Designation:</span> {designation}</div>
          <div><span className="text-muted-foreground">Institution:</span> {institution}</div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Categories:</span>
            {categories.map((cat) => (
              <Badge key={cat} className="capitalize">
                {cat}
              </Badge>
            ))}
          </div>
        </div>

        {/* Financials */}
        <div className="pt-4 border-t mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><span className="text-muted-foreground">Subtotal:</span> ₱{subtotal.toLocaleString()}</div>
          {isInternal && (
            <div><span className="text-muted-foreground">Discount (12%):</span> ₱{discount.toLocaleString()}</div>
          )}
          <div className="col-span-full text-lg font-semibold">
            Total: <span className="text-primary">₱{total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* PDF Controls */}
      <div className="rounded-md border bg-white shadow-sm p-6 space-y-2">
        <h2 className="text-lg font-medium">Quotation PDF</h2>
        <DownloadButtonSection
          referenceNumber={referenceNumber as string}
          services={services}
          clientInfo={{ name, email, institution, designation }}
          useInternalPrice={isInternal}
        />
      </div>
    </div>
  );
}