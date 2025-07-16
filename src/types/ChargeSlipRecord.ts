// src/types/ChargeSlipRecord.ts
import { Client } from "./Client";
import { Project } from "./Project";
import { AdminInfo } from "./Admin";
import { SelectedService } from "./SelectedService";
import { Timestamp } from "firebase/firestore";

/**
 * Allowed service categories in charge slips.
 */
export type ValidCategory = "equipment" | "retail" | "bioinformatics" | "laboratory";

/**
 * Constant array of valid service categories (for UI/filtering/validation).
 */
export const VALID_CATEGORIES: ValidCategory[] = [
  "equipment",
  "retail",
  "bioinformatics",
  "laboratory",
];

export interface ChargeSlipRecord {
  id?: string; // Firestore document ID

  chargeSlipNumber: string;
  referenceNumber: string;

  cid: string; // For filtering by client
  client: Client;

  projectId: string;
  project: Project;

  services: SelectedService[];
  useInternalPrice: boolean;

  preparedBy: AdminInfo;
  approvedBy: {
    name: string;
    position: string;
  };

  clientInfo: {
    name: string;
    institution: string;
    designation: string;
    email: string;
    address?: string; // Optional address field
  };

  // Firestore-compatible timestamp fields
  dateIssued?: string | Timestamp | Date | null;
  dateOfOR?: string | Timestamp | Date | null;
  createdAt?: string | Timestamp | Date | null;
  datePaid?: string | Timestamp | Date | null;

  dvNumber?: string;
  orNumber?: string;
  notes?: string;

  subtotal: number;
  discount: number;
  total: number;

  categories?: ValidCategory[]; // Now restricted to valid enums only
  status?: string;
}