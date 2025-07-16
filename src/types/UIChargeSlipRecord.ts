// src/types/UIChargeSlipRecord.ts
import { ValidCategory } from "@/types/ValidCategory"; // or wherever it's defined

export interface UIChargeSlipRecord {
  chargeSlipNumber: string;

  // Dates as JavaScript Date objects (transformed from Firestore Timestamps)
  dateIssued?: Date;
  dateOfOR?: Date;
  createdAt?: Date;

  total: number;

  // Optional status field for filtering and display
  status?: "processing" | "paid" | "cancelled";

  // For filtering and project linkage
  cid: string;
  projectId: string;

  // Displayed client info (flattened from Client)
  clientInfo: {
    name?: string;
    address: string;
  };

  // Full client object (optional fields preserved)
  client: {
    createdAt?: Date;
    address: string;
    [key: string]: any;
  };

  // Full project object
  project: {
    title?: string;
    [key: string]: any;
  };

  // Valid categories: "laboratory", "equipment", "bioinformatics", "retail"
    categories: ValidCategory[];
  // Selected services included in the charge slip
  services: {
    name: string;
    type: string;
  }[];

  // Optional charge slip metadata
  dvNumber?: string;
  orNumber?: string;
  notes?: string;

  // Assigned admin
  preparedBy?: {
    name: string;
    position: string;
  };
}