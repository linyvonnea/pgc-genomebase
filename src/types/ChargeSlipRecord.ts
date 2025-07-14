// src/types/ChargeSlipRecord.ts
import { Client } from "./Client";
import { Project } from "./Project";
import { AdminInfo } from "./Admin";
import { SelectedService } from "./SelectedService";
import { Timestamp } from "firebase/firestore";

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
  dateIssued: string | Timestamp;
  dateOfOR?: string | Timestamp | null; // ✅ Accepts null
  createdAt?: string | Timestamp;

  dvNumber?: string;
  orNumber?: string;
  notes?: string;

  subtotal: number;
  discount: number;
  total: number;

  categories?: string[]; // Optional category tags
  status?: "paid" | "cancelled" | "processing"; // Optional status field
}