"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getQuotationByReferenceNumber } from "@/services/quotationService";
import { QuotationRecord } from "@/types/Quotation";
import { notFound, useRouter } from "next/navigation";
import DownloadButtonSection from "@/components/pdf/DownloadButtonSection";
import { Button } from "@/components/ui/button";

export default function QuotationDetailPageClient() {
  const { referenceNumber } = useParams(); // 👈 Get params here
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

  if (loading) return <div className="p-6">Loading quotation...</div>;
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quotation: {referenceNumber}</h1>
        <Button variant="outline" onClick={() => router.push("/admin/quotations")}>
          ← Back to List
        </Button>
      </div>

      <div className="border rounded-md p-4 space-y-3 text-sm bg-white shadow-sm">
        <div><strong>Prepared By:</strong> {preparedBy || "—"}</div>
        <div><strong>Date Issued:</strong> {new Date(dateIssued).toLocaleDateString()}</div>
        <div><strong>Client:</strong> {name} ({email})</div>
        <div><strong>Institution:</strong> {institution}</div>
        <div><strong>Designation:</strong> {designation}</div>
        <div><strong>Categories:</strong> {categories.join(", ")}</div>
        <div><strong>Subtotal:</strong> ₱{subtotal.toLocaleString()}</div>
        {isInternal && (
          <div><strong>Discount (12%):</strong> ₱{discount.toLocaleString()}</div>
        )}
        <div>
          <strong>Total:</strong>{" "}
          <span className="font-medium text-primary">
            ₱{total.toLocaleString()}
          </span>
        </div>
      </div>

     <DownloadButtonSection
        referenceNumber={referenceNumber as string}
        services={services}
        clientInfo={{
          name,
          email,
          institution,
          designation,
        }}
        useInternalPrice={isInternal}
      />
    </div>
  );
}