// src/schemas/projectSchema.ts
import { z } from "zod";

export const projectSchema = z.object({
  title: z.string().min(1, "Title is required"),
  projectLead: z.string().min(1, "Project Lead is required"),
  startDate: z.date(),
  endDate: z.date().nullable(),
  sendingInstitution: z.string().min(1, "Sending institution is required"),
  fundingInstitution: z.string().min(1, "Funding institution is required"),

});

export type ProjectFormData = z.infer<typeof projectSchema>;
