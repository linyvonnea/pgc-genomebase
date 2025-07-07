// src/lib/generateReferenceNumber.ts

import { mockQuotationHistory } from "@/mock/mockQuotationHistory";

/**
 * Generates the next available reference number based on existing mock quotation history.
 * Ensures suffix increments correctly per year.
 */
export function generateNextReferenceNumber(currentYear: number): string {
  const prefix = "VMENF-Q";

  // Flatten all quotations across inquiries
  const allQuotations = Object.values(mockQuotationHistory).flat();

  // Filter by matching year in reference number (e.g., VMENF-Q-2025-001)
  const thisYearQuotations = allQuotations.filter((q) =>
    q.referenceNumber.includes(`-${currentYear}-`)
  );

  // Extract numeric suffix from reference numbers
  const lastSuffix = thisYearQuotations
    .map((q) => {
      const parts = q.referenceNumber.split("-");
      return parseInt(parts[3], 10); // e.g., '001'
    })
    .sort((a, b) => b - a)[0] || 0;

  const nextSuffix = String(lastSuffix + 1).padStart(3, "0");

  return `${prefix}-${currentYear}-${nextSuffix}`;
}