// src/types/ServiceItem.ts
export interface ServiceItem {
  id: string;
  name: string;
  category: string;
  type: "Laboratory" | "Equipment" | "Bioinformatics" | "Retail" | "Training";
  unit: string;
  price: number;
  description?: string; // Optional detailed description for service
  minQuantity?: number;
  additionalUnitPrice?: number;
  minParticipants?: number;
  additionalParticipantPrice?: number;
}