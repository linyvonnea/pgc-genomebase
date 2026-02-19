export interface Project {
  pid?: string;
  iid?: string | string[];
  year?: number;
  startDate?: string;
  createdAt?: Date;
  lead?: string;
  clientNames?: string[];
  title?: string;
  projectTag?: string;
  status?: "Pending" | "Ongoing" | "Cancelled" | "Completed";
  sendingInstitution?: "UP System" |"SUC/HEI" | "Government" | "Private/Local" | "International" | "N/A";
  fundingCategory?: "External" | "In-House";
  fundingInstitution?: string;
  serviceRequested?: string[];
  personnelAssigned?: string;
  notes?: string;
}

