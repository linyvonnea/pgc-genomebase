// src/types/SelectedService.ts
import { ServiceItem } from "./ServiceItem";

export interface SelectedService extends ServiceItem {
  quantity: number;
}