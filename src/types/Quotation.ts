// src/types/Quotation.ts
import { ServiceItem } from "./ServiceItem";

export type SelectedService = ServiceItem & {
  quantity: number;
};

export interface QuotationRecord {
  id?: string;
  referenceNumber: string;
  name: string;
  institution: string;
  designation: string;
  email: string;
  services: SelectedService[]; // Use proper type
  isInternal: boolean;
  dateIssued: string;
  year: number;
  subtotal: number;
  discount: number;
  total: number;
  preparedBy: string;
  categories: string[];
  inquiryId: string;
}