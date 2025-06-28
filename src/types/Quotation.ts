import { QuotationItem } from "./QuotationItem";

export interface Quotation {
  id: string;
  clientId: string;
  type: "Laboratory" | "Equipment";
  items: QuotationItem[];
  total: number;
  status: "draft" | "submitted" | "approved" | "rejected";
  generatedAt: Date;
}