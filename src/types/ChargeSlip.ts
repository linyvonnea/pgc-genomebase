export interface ChargeSlip {
  id: string;
  projectId: string;
  preparedBy: string;
  dateIssued: Date;
  amount: number;
}