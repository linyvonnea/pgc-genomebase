export interface Project {
  pid?: string;
  iid?: string;
  year?: number;
  startDate?: string;
  createdAt?: Date;
  lead?: string;
  clientNames?: string[];
  title?: string;
  projectTag?: string;
  status?: string;
  sendingInstitution?: string;
  fundingCategory?: string;
  fundingInstitution?: string;
  serviceRequested?: string[];
  personnelAssigned?: string;
  notes?: string;
}

