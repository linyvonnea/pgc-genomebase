// src/types/ServiceItem.ts
export interface ServiceItem {
  id: string;
  name: string;
  category: string;
  type: "Laboratory" | "Equipment" | "Bioinformatics" | "Retail";
  unit: string;
  price: number;
}