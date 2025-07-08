// src/mock/mockQuotationHistory.ts
import { QuotationRecord } from "@/types/Quotation";

// Flat array of all quotation records with inquiryId
export const mockQuotationHistory: (QuotationRecord & { inquiryId: string })[] = [
  {
    inquiryId: "I-2025-001",
    referenceNumber: "VMENF-Q-2025-001",
    clientInfo: {
      name: "Juan Dela Cruz",
      institution: "UP Visayas",
      designation: "Research Associate",
      email: "juan@example.com",
    },
    services: [
      {
        id: "LAB-SVC-001",
        name: "DNA Extraction",
        unit: "per sample",
        price: 500,
        quantity: 10,
        category: "Nucleic Acid",
        type: "Laboratory",
      },
    ],
    isInternal: true,
    remarks: "For confirmation. Valid for 30 days.",
    dateIssued: "2025-07-08T10:00:00.000Z",
    year: 2025,
    subtotal: 5000,
    discount: 600,
    total: 4400,
    preparedBy: "MA. CARMEL F. JAVIER, M.Sc.",
    categories: ["Laboratory"],
  },
  {
    inquiryId: "I-2025-002",
    referenceNumber: "VMENF-Q-2025-002",
    clientInfo: {
      name: "Maria Santos",
      institution: "DOST",
      designation: "Project Leader",
      email: "maria@dost.gov.ph",
    },
    services: [
      {
        id: "EQP-SVC-001",
        name: "PCR Thermocycler",
        unit: "per hour",
        price: 800,
        quantity: 5,
        category: "Thermal",
        type: "Equipment",
      },
    ],
    isInternal: false,
    remarks: "Pending fund approval.",
    dateIssued: "2025-07-01T12:00:00.000Z",
    year: 2025,
    subtotal: 4000,
    discount: 0,
    total: 4000,
    preparedBy: "MA. CARMEL F. JAVIER, M.Sc.",
    categories: ["Equipment"],
  },
];

// Add a new quotation to mock history
export function addMockQuotation(inquiryId: string, newQuotation: QuotationRecord) {
  mockQuotationHistory.push({ ...newQuotation, inquiryId });
}

export function updateQuotationRemark(refNumber: string, newRemark: string) {
  const record = mockQuotationHistory.find((q) => q.referenceNumber === refNumber);
  if (record) {
    record.remarks = newRemark;
  }
}




