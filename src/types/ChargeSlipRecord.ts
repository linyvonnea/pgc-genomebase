import { Client } from "./Client";
import { Project } from "./Project";
import { AdminInfo } from "./Admin";
import { SelectedService } from "./SelectedService";

export interface ChargeSlipRecord {
  id?: string; // Firestore doc ID, optional
  chargeSlipNumber: string;
  referenceNumber: string;

  cid: string; // 🔁 NEW: Separate client ID for direct filtering
  client: Client;

  projectId: string;
  project: Project;

  services: SelectedService[];
  orNumber: string;
  useInternalPrice: boolean;

  preparedBy: AdminInfo;
  approvedBy: {
    name: string;
    position: string;
  };

  dateIssued: string; // ISO format string
  subtotal: number;
  discount: number;
  total: number;

  clientInfo: {
    name: string;
    institution: string;
    designation: string;
    email: string;
  };
}