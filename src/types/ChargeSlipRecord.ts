// src/types/ChargeSlipRecord.ts

import { Client } from "./Client";
import { Project } from "./Project";
import { AdminInfo } from "./Admin";
import { SelectedService } from "./SelectedService";

export interface ChargeSlipRecord {
  id: string;
  chargeSlipNumber: string;
  referenceNumber: string;
  projectId: string;
  client: Client;
  project: Project;
  services: SelectedService[];
  orNumber: string;
  useInternalPrice: boolean;
  preparedBy: AdminInfo;
  approvedBy: {
    name: string;
    position: string;
  };
  dateIssued: string;
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