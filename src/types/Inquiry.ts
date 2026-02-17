export interface Inquiry {
  id: string;
  createdAt: Date;
  name: string;
  isApproved: boolean;
  status: 'Pending' | 'Approved Client' | 'Quotation Only';
  affiliation: string;
  designation: string;
  email?: string;
}