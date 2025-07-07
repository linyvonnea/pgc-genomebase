export interface Project {
  pid: string;
  cid: string;
  year: number;
  startDate: string;
  endDate: string | null;
  lead: string;
  clientNames: string[];
  title: string;
  projectTag: string;
  status: "Ongoing" | "Completed" | "Cancelled";
  sendingInstitution: string;
  fundingCategory: string;
  fundingInstitution: string;
  serviceRequested: string[];
  personnelAssigned: string;
  notes: string;
}

