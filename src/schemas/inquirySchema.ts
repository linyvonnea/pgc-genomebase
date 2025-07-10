// src/schemas/inquirySchema.ts
import { z } from "zod";

// Base schema without service (for stored data)
export const inquirySchema = z.object({
  id: z.string(),
  year: z.number(),
  createdAt: z.date(),
  name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  affiliation: z.string().min(1, "Affiliation is required").max(200, "Affiliation must be at most 200 characters"),
  designation: z.string().min(1, "Designation is required").max(100, "Designation must be at most 100 characters"),
  // Laboratory Service fields
  workflows: z.array(z.enum([
    "dna-extraction",
    "sequencing", 
    "pcr-amplification",
    "bioinformatics",
    "quantification",
    "complete-workflow"
  ])).optional(),
  additionalInfo: z.string().max(1000, "Additional information must be at most 1000 characters").optional(),
  // Research and Collaboration fields
  projectBackground: z.string().max(2000, "Project background must be at most 2000 characters").optional(),
  projectBudget: z.string().max(50, "Project budget must be at most 50 characters").optional(),
  // Training Service fields
  specificTrainingNeed: z.string().max(500, "Specific training need must be at most 500 characters").optional(),
  targetTrainingDate: z.string().optional(), // Store as ISO string
  numberOfParticipants: z.number().min(1, "Number of participants must be at least 1").optional(),
  isApproved: z.boolean().default(false),
  status: z.enum(['Pending', 'Approved Client', 'Quotation Only']),
  email: z.string().email("Invalid email address").optional(),
});

// Schema specifically for form validation (includes service field)
export const inquiryFormSchema = inquirySchema
  .omit({ 
    id: true, 
    createdAt: true, 
    year: true,
    isApproved: true,
    status: true,
  })
  .extend({
    service: z.enum(["laboratory", "research", "training"], {
      required_error: "Service selection is required",
    }),
  })
  .refine((data) => {
    // If research service is selected, project background should be provided
    if (data.service === "research") {
      return data.projectBackground && data.projectBackground.trim().length > 0;
    }
    return true;
  }, {
    message: "Project background is required for research collaboration",
    path: ["projectBackground"],
  })
  .refine((data) => {
    // If training service is selected, specific training need should be provided
    if (data.service === "training") {
      return data.specificTrainingNeed && data.specificTrainingNeed.trim().length > 0;
    }
    return true;
  }, {
    message: "Specific training need is required for training service",
    path: ["specificTrainingNeed"],
  })
  .refine((data) => {
    // If training service is selected, target date should be provided
    if (data.service === "training") {
      return data.targetTrainingDate && data.targetTrainingDate.trim().length > 0;
    }
    return true;
  }, {
    message: "Target training date is required for training service",
    path: ["targetTrainingDate"],
  })
  .refine((data) => {
    // If training service is selected, number of participants should be provided
    if (data.service === "training") {
      return data.numberOfParticipants && data.numberOfParticipants > 0;
    }
    return true;
  }, {
    message: "Number of participants is required for training service",
    path: ["numberOfParticipants"],
  });

// For updating an inquiry (all fields optional except id)
export const inquiryUpdateSchema = inquirySchema.partial().extend({
  id: z.string().min(1, "ID is required"),
});

// Type definitions
export type InquiryData = z.infer<typeof inquirySchema>;
export type InquiryFormData = z.infer<typeof inquiryFormSchema>;
export type InquiryUpdateData = z.infer<typeof inquiryUpdateSchema>;

// Workflow options type for TypeScript
export type WorkflowOption = "dna-extraction" | "sequencing" | "pcr-amplification" | "bioinformatics" | "quantification" | "complete-workflow";
export type ServiceType = "laboratory" | "research" | "training";
