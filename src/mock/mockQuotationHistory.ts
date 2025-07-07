// src/mock/mockQuotationHistory.ts

import { QuotationRecord } from "@/types/Quotation";

// Mock quotation history mapped by inquiry ID
export const mockQuotationHistory: Record<string, QuotationRecord[]> = {
  "I-2025-001": [
    {
      referenceNumber: "VMENF-Q-2025-001",
      clientInfo: {
        name: "Jane Doe",
        institution: "UPV",
        designation: "Researcher",
        email: "jane@example.com",
      },
      services: [],
      isInternal: true,
      remarks: "For confirmation. Valid for 30 days.",
      dateIssued: "2025-07-07T08:00:00.000Z",
      year: 2025,
    },
  ],
  // Add more inquiry IDs and their quotation arrays as needed
};

// Function to add a quotation to mock history
export function addMockQuotation(inquiryId: string, quotation: QuotationRecord) {
  if (!mockQuotationHistory[inquiryId]) {
    mockQuotationHistory[inquiryId] = [];
  }
  mockQuotationHistory[inquiryId].push(quotation);
}