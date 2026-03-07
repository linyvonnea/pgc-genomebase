export interface Inquiry {
  id: string;
  createdAt: Date;
  name: string;
  isApproved: boolean;
  status: 'Pending' | 'Approved Client' | 'Quotation Only';
  affiliation: string;
  designation: string;
  email?: string;
  serviceType?: string | null;
  species?: string | null;
  otherSpecies?: string | null;
  researchOverview?: string | null;
  methodologyFileUrl?: string | null;
  sampleCount?: number | null;
  workflowType?: string | null;
  individualAssayDetails?: any;
  workflows?: any[];
  additionalInfo?: string | null;
  projectBackground?: string | null;
  projectBudget?: string | null;
  specificTrainingNeed?: string | null;
  targetTrainingDate?: string | null;
  numberOfParticipants?: number | null;
  haveSubmitted?: boolean;
  hasOpenedQuotation?: boolean;
  hasLoggedIn?: boolean;
}


