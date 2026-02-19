
import { z } from "zod";

// Schema for the project form (minimal fields)
export const projectFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  projectLead: z.string().min(1, "Project Lead is required"),
  startDate: z.date(),
  sendingInstitution: z.enum(["UP System", "SUC/HEI", "Government", "Private/Local", "International", "N/A"]),
  fundingInstitution: z.string().min(1, "Funding institution is required"),
});

export type ProjectFormData = z.infer<typeof projectFormSchema>;

// Full schema for Firestore/admin table
export const projectSchema = z.object({
  pid: z.string().optional().or(z.literal("")),
  iid: z.union([z.string(), z.array(z.string())]).optional().or(z.literal("")),
  year: z.number().optional().or(z.nan()),
  startDate: z.union([z.date(), z.string()]).optional().or(z.literal("")),
  createdAt: z.union([z.date(), z.string()]).optional().or(z.literal("")),
  lead: z.string().optional().or(z.literal("")),
  clientNames: z
    .union([z.array(z.string()), z.string()])
    .transform((val) => (typeof val === "string" ? val.split(",").map((s) => s.trim()).filter(Boolean) : val))
    .optional()
    .default([]),
  title: z.string().optional().or(z.literal("")),
  projectTag: z.string().optional().or(z.literal("")),
  status: z.string().optional().or(z.literal("")),
  sendingInstitution: z.string().optional().or(z.literal("")),
  fundingCategory: z.string().optional().or(z.literal("")),
  fundingInstitution: z.string().optional().or(z.literal("")),
  serviceRequested: z
    .union([z.array(z.string()), z.string()])
    .transform((val) => (typeof val === "string" ? val.split(",").map((s) => s.trim()) : val))
    .optional(),
  personnelAssigned: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});
