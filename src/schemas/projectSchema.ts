// src/schemas/projectSchema.ts
import { z } from "zod";

// Schema for the project form (minimal fields)
export const projectFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  projectLead: z.string().min(1, "Project Lead is required"),
  startDate: z.date(),
  sendingInstitution: z.string().min(1, "Sending institution is required"),
  fundingInstitution: z.string().min(1, "Funding institution is required"),
});

export type ProjectFormData = z.infer<typeof projectFormSchema>;

// Full schema for Firestore/admin table
export const projectSchema = z.object({
  pid: z.string().optional(),
  iid: z.string().optional(),
  year: z.number().optional(),
  startDate: z.date().optional(),
  createdAt: z.date().optional(),
  lead: z.string().optional(),
  clientNames: z.array(z.string()).optional(),
  title: z.string().optional(),
  projectTag: z.string().optional(),
  status: z.string().optional(),
  sendingInstitution: z.string().optional(),
  fundingCategory: z.string().optional(),
  fundingInstitution: z.string().optional(),
  serviceRequested: z.array(z.string()).optional(),
  personnelAssigned: z.string().optional(),
  notes: z.string().optional(),
});
