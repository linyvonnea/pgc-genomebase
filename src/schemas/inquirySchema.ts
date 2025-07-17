/**
 * Inquiry Schema Definitions
 * 
 * This file contains Zod schema definitions for inquiry validation and type safety.
 * Zod provides runtime validation and automatic TypeScript type inference.
 */

import { z } from "zod";

/**
 * Base inquiry schema for stored data in Firestore
 * 
 * This schema represents the complete structure of an inquiry document
 * as it exists in the database. All service-specific fields are optional
 * since not every inquiry will have all fields populated.
 * 
 * Used in:
 * - inquiryService.ts for data transformation from Firestore
 * - Type definitions for Inquiry objects
 * - Validation when reading data from database
 */
export const inquirySchema = z.object({
  // Core identification fields
  id: z.string(), 
  createdAt: z.date(), 
  
  // Required user information fields
  name: z.string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),
  affiliation: z.string()
    .min(1, "Affiliation is required")
    .max(200, "Affiliation must be at most 200 characters"),
  designation: z.string()
    .min(1, "Designation is required")
    .max(100, "Designation must be at most 100 characters"),
  
  // Laboratory Service specific fields
  workflows: z.array(z.enum([
    "dna-extraction",     
    "sequencing",         
    "pcr-amplification",  
    "bioinformatics",     
    "quantification",     
    "complete-workflow"   
  ])).optional(), 
  
  additionalInfo: z.string()
    .max(1000, "Additional information must be at most 1000 characters")
    .optional(), 
  
  // Research and Collaboration Service fields
  projectBackground: z.string()
    .max(2000, "Project background must be at most 2000 characters")
    .optional(), 
  
  projectBudget: z.string()
    .max(50, "Project budget must be at most 50 characters")
    .optional(),
  
  // Training Service specific fields
  specificTrainingNeed: z.string()
    .max(500, "Specific training need must be at most 500 characters")
    .optional(), 
  
  targetTrainingDate: z.string().optional(), 
  
  numberOfParticipants: z.number()
    .min(1, "Number of participants must be at least 1")
    .optional(),
  
  // System status fields
  isApproved: z.boolean().default(false),         
  status: z.enum(['Pending', 'Approved Client', 'Quotation Only']),
  email: z.string().email("Invalid email address").optional(), 
});

/**
 * Form validation schema for inquiry submission
 * 
 * This schema is used specifically for validating form data when users
 * submit new inquiries. It includes the service type field and has
 * conditional validation rules based on the selected service.
 * 
 * Used in:
 * - Public inquiry submission forms
 * - Form validation hooks (useForm with zodResolver)
 * - inquiryActions.ts for server-side validation
 * - Form component prop types
 */
export const inquiryFormSchema = inquirySchema
  .omit({ 
    id: true,         // ID is not provided by user, set by server
    createdAt: true,  // Set by server
    isApproved: true, // Set by server
    status: true,     // Set by server
  })
  .extend({
    // Add service type selection (required for form submissions)
    service: z.enum(["laboratory", "research", "training"], {
      required_error: "Service selection is required",
    }),
  })
  // Conditional validation: Research service requires project background
  .refine((data) => {
    if (data.service === "research") {
      return data.projectBackground && data.projectBackground.trim().length > 0;
    }
    return true; // Valid for non-research services
  }, {
    message: "Project background is required for research collaboration",
    path: ["projectBackground"], 
  })
  // Conditional validation: Training service requires specific training need
  .refine((data) => {
    if (data.service === "training") {
      return data.specificTrainingNeed && data.specificTrainingNeed.trim().length > 0;
    }
    return true;
  }, {
    message: "Specific training need is required for training service",
    path: ["specificTrainingNeed"],
  })
  // Conditional validation: Training service requires target date
  .refine((data) => {
    if (data.service === "training") {
      return data.targetTrainingDate && data.targetTrainingDate.trim().length > 0;
    }
    return true;
  }, {
    message: "Target training date is required for training service",
    path: ["targetTrainingDate"],
  })
  // Conditional validation: Training service requires number of participants
  .refine((data) => {
    if (data.service === "training") {
      return data.numberOfParticipants && data.numberOfParticipants > 0;
    }
    return true;
  }, {
    message: "Number of participants is required for training service",
    path: ["numberOfParticipants"],
  });

/**
 * Update schema for modifying existing inquiries
 * 
 * This schema is used when updating inquiry records through admin interface.
 * All fields except ID are optional to allow partial updates.
 * 
 * Used in:
 * - Admin inquiry edit forms
 * - Update operations in inquiryActions.ts
 * - PATCH API endpoints
 */
export const inquiryUpdateSchema = inquirySchema.partial().extend({
  id: z.string().min(1, "ID is required"), 
});

/**
 * TypeScript type definitions inferred from Zod schemas
 * 
 * These types are automatically generated from the schemas above
 * and provide compile-time type safety throughout the application.
 */
export type InquiryData = z.infer<typeof inquirySchema>; // Complete inquiry object
export type InquiryFormData = z.infer<typeof inquiryFormSchema>; // Form submission data
export type InquiryUpdateData = z.infer<typeof inquiryUpdateSchema>; // Update operation data

/**
 * Utility types for specific enum values
 * 
 * These types provide autocomplete and type safety when working
 * with specific field values in the application.
 */
export type WorkflowOption = "dna-extraction" | "sequencing" | "pcr-amplification" | "bioinformatics" | "quantification" | "complete-workflow";
export type ServiceType = "laboratory" | "research" | "training";
