import { z } from "zod";

export const adminProjectSchema = z.object({
  year: z.number().optional(),
  pid: z.string().optional(),
  iid: z.union([z.string(), z.array(z.string())]).optional().or(z.literal("")),
  startDate: z.date().optional(),
  title: z.string().optional(),
  projectTag: z.string().optional(),
  sendingInstitution: z.enum(["UP System", "SUC/HEI", "Government", "Private/Local", "International", "N/A"]).optional(),
  fundingInstitution: z.string().optional(),
  fundingCategory: z.enum(["External", "In-House"]).optional().or(z.literal("")).or(z.undefined()),
  status: z.string().optional().or(z.literal("")).or(z.undefined()),
  lead: z.string().optional(),
  serviceRequested: z.array(z.enum([
    "Laboratory Services",
    "Retail Sales",
    "Equipment Use",
    "Bioinformatics Analysis",
    "Training"
  ])).optional().or(z.undefined()),
  personnelAssigned: z.string().optional(),
  notes: z.string().optional(),

});

export type AdminProjectData = z.infer<typeof adminProjectSchema>;
