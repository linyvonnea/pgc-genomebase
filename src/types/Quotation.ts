import { ServiceItem } from "./ServiceItem";
import { SelectedService } from "./SelectedService";

/**
 * Represents a finalized quotation record stored in Firestore.
 */
export interface QuotationRecord {
  id?: string; // Optional Firestore document ID
  referenceNumber: string;
  name: string;
  institution: string;
  designation: string;
  email: string;
  services: SelectedService[]; // Each service must include a fixed quantity
  isInternal: boolean;
  dateIssued: string; // ISO 8601 string
  year: number;
  subtotal: number;
  discount: number;
  total: number;
  preparedBy: {
    name: string;
    position: string;
  };
  categories: string[]; // ["Laboratory", "Equipment", ...]
  inquiryId: string; // Link to source inquiry
}

export type { SelectedService };