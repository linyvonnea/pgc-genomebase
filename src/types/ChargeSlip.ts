export interface ChargeSlip {
  id: string;
  projectId: string;
  preparedBy: string;
  dateIssued: Date;
  remarks: string;
  amount: number;
}