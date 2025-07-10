import { z } from "zod";

export const adminProjectSchema = z.object({
  pid: z.string().min(1, "Project ID is required"),
  title: z.string().min(1, "Project Title is required"),
  lead: z.string().optional(),
  // Add more fields as needed for your admin modal
});

export type AdminProjectData = z.infer<typeof adminProjectSchema>;
