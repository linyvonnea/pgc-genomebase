export interface Project {
  id: string;
  clientId: string;
  title: string;
  description: string;
  status: "ongoing" | "completed" | "pending";
  startDate: Date;
  endDate: Date | null;
}