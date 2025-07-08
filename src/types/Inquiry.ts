export interface Inquiry {
  id: string;
  year: number;
  createdAt: Date;
  name: string;
  isApproved: boolean;
  status: 'Pending' | 'Approved Client' | 'Quotation Only'; // Add this new field
  affiliation: string;
  designation: string;
  email?: string;
}