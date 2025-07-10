import { z } from "zod";

export const adminProjectSchema = z.object({
    year: z.number(),
  pid: z.string().min(1, "Project ID is required"),
  startDate: z.date(),
  title: z.string().min(1, "Project Title is required"),
  projectTag: z.string().min(1, "Project Title is required"),
  sendingInstitution: z.enum(["UP System", "SUC/HEI", "Government", "Private/Local", "International", "N/A"]),
  fundingInstitution: z.string().min(1, "Funding institution is required"),
  fundingCategory: z.enum(["External", "In-House"]).optional().or(z.literal("")).or(z.undefined()),
  status: z.string().min(1, "Status is required").optional().or(z.literal("")).or(z.undefined()),
  lead: z.string().optional(),
serviceRequested: z.array(z.string()).optional(),
  personnelAssigned: z.string().optional(),
  notes: z.string().optional(),

  // Add more fields as needed for your admin modal
});

export type AdminProjectData = z.infer<typeof adminProjectSchema>;
