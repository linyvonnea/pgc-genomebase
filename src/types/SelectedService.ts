// src/types/SelectedService.ts
import { ServiceItem } from "./ServiceItem";

// Used during editing/selection; allows temporary empty string for quantity
export interface EditableSelectedService extends ServiceItem {
  quantity: number | "";
  samples?: number | "";
  description?: string; // Add description
}

// Used in final quotation records and PDF output; requires a number
export interface SelectedService extends ServiceItem {
  quantity: number;
  description?: string;
}
