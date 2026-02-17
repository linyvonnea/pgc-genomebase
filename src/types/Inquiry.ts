export interface Inquiry {
  id: string;
  createdAt: Date;
  name: string;
  isApproved: boolean;
  status: 'Pending' | 'Approved Client' | 'Quotation Only';
  affiliation: string;
  designation: string;
  email?: string;
  
  // Service type
  serviceType?: 'laboratory' | 'bioinformatics' | 'equipment' | 'retail' | 'research' | 'training' | null;
  
  // New Service Selection Fields
  species?: 'human' | 'animal' | 'plant' | 'bacterial' | 'viral' | 'others' | null;
  otherSpecies?: string | null;
  researchOverview?: string | null;
  methodologyFileUrl?: string | null;
  sampleCount?: number | null;
  workflowType?: 'complete_workflow' | 'individual_assay' | null;
  individualAssayDetails?: string | null;
  
  // Legacy Service-specific fields
  workflows?: string[];
  additionalInfo?: string | null;
  projectBackground?: string | null;
  projectBudget?: string | null;
  specificTrainingNeed?: string | null;
  targetTrainingDate?: string | null;
  numberOfParticipants?: number | null;
  
  // System fields
  haveSubmitted?: boolean;
}