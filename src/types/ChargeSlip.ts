import { AdminInfo } from "./Admin";

export interface ChargeSlip {
  id: string;
  projectId: string;
  preparedBy: AdminInfo; // Updated to use AdminInfo type
  dateIssued: string; // Changed to string to match usage
  amount: number;
}