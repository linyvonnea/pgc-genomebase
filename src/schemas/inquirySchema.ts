// src/schemas/inquirySchema.ts
import { z } from "zod";

export const inquirySchema = z.object({
  id: z.string().min(1, "ID is required"),
  year: z.number().int().min(2000, "Year must be at least 2000").max(2100, "Year must be at most 2100"),
  createdAt: z.date(),
  name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  isApproved: z.boolean(),
  affiliation: z.string().min(1, "Affiliation is required").max(200, "Affiliation must be at most 200 characters"),
  designation: z.string().min(1, "Designation is required").max(100, "Designation must be at most 100 characters"),
  email: z.string().email("Invalid email address"),
});

// For form data that might not include all fields (e.g., during creation)
export const inquiryFormSchema = inquirySchema.omit({ 
  id: true, 
  createdAt: true, 
  year: true 
}).extend({
  year: z.number().int().min(2000, "Year must be at least 2000").max(2100, "Year must be at most 2100").optional(),
});

// For updating an inquiry (all fields optional except id)
export const inquiryUpdateSchema = inquirySchema.partial().extend({
  id: z.string().min(1, "ID is required"),
});

export type InquiryFormData = z.infer<typeof inquiryFormSchema>;
export type InquiryUpdateData = z.infer<typeof inquiryUpdateSchema>;
export type InquiryData = z.infer<typeof inquirySchema>;
