// src/components/QuotationDetailPageClient.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { mockQuotationRecords } from "@/mock/mockQuotationRecords";
import {
  mockQuotationHistory,
  updateQuotationRemark,
} from "@/mock/mockQuotationHistory";
import DownloadButtonSection from "@/components/pdf/DownloadButtonSection";
import { Button } from "@/components/ui/button";

export default function QuotationDetailPageClient({
  referenceNumber,
}: {
  referenceNumber: string;
}) {
  const router = useRouter();

  const quotation =
    mockQuotationRecords.find((q) => q.referenceNumber === referenceNumber) ||
    mockQuotationHistory.find((q) => q.referenceNumber === referenceNumber);

  if (!quotation) return notFound();

  const [remarks, setRemarks] = useState(quotation.remarks || "");

  const {
    clientInfo,
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
        <div>
          <strong>Prepared By:</strong> {preparedBy || "—"}
        </div>
        <div>
          <strong>Date Issued:</strong>{" "}
          {new Date(dateIssued).toLocaleDateString()}
        </div>
        <div>
          <strong>Client:</strong> {clientInfo.name} ({clientInfo.email})
        </div>
        <div>
          <strong>Institution:</strong> {clientInfo.institution}
        </div>
        <div>
          <strong>Designation:</strong> {clientInfo.designation}
        </div>
        <div>
          <strong>Categories:</strong> {categories.join(", ")}
        </div>
        <div>
          <strong>Subtotal:</strong> ₱{subtotal.toLocaleString()}
        </div>
        {isInternal && (
          <div>
            <strong>Discount (12%):</strong> ₱{discount.toLocaleString()}
          </div>
        )}
        <div>
          <strong>Total:</strong>{" "}
          <span className="font-medium text-primary">
            ₱{total.toLocaleString()}
          </span>
        </div>
        <div>
          <strong>Remarks:</strong>
          <textarea
            value={remarks}
            onChange={(e) => {
              setRemarks(e.target.value);
              updateQuotationRemark(referenceNumber, e.target.value);
            }}
            className="w-full mt-1 text-sm border rounded px-2 py-1"
          />
        </div>
      </div>

      <DownloadButtonSection
        referenceNumber={referenceNumber}
        services={services}
        clientInfo={clientInfo}
        useInternalPrice={isInternal}
        remarks={remarks}
      />
    </div>
  );
}