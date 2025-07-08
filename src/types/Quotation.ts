// src/types/Quotation.ts
import { ServiceItem } from "./ServiceItem";

export type SelectedService = ServiceItem & {
  quantity: number;
};

export type QuotationRecord = {
  inquiryId: string;
  referenceNumber: string;
  clientInfo: {
    name: string;
    institution: string;
    designation: string;
    email: string;
  };
  services: SelectedService[];
  isInternal: boolean;
  remarks: string;
  dateIssued: string;
  year: number;
  subtotal: number;
  discount: number;
  total: number;
  preparedBy: string;
  categories: string[];
};