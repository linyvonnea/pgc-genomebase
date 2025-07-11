// src/types/ChargeSlipRecord.ts
import { Client } from "./Client";
import { Project } from "./Project";
import { AdminInfo } from "./Admin";
import { SelectedService } from "./SelectedService";

export interface ChargeSlipRecord {
  id: string;
  chargeSlipNumber: string;
  projectId: string;
  client: Client;
  project: Project;
  services: SelectedService[];
  orNumber: string;
  useInternalPrice: boolean;
  preparedBy: AdminInfo;
  approvedBy: string;
  dateIssued: string;
  subtotal: number;
  discount: number;
  total: number;
  referenceNumber: string;
  clientInfo: {
    name: string;
    institution: string;
    designation: string;
    email: string;
  };
}