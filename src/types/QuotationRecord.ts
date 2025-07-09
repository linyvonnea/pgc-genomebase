// src/types/QuotationRecord.ts
import { SelectedService } from "./SelectedService";

/**
 * Represents a generated quotation record.
 */
export type QuotationRecord = {
  referenceNumber: string;
  clientInfo: {
    name: string;
    institution: string;
    designation: string;
    email: string;
  };
  services: SelectedService[];
  isInternal: boolean;
  dateIssued: string;
  preparedBy: {
    name: string;
    position: string;
  };
};