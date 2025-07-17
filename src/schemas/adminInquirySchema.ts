/**
 * Admin Inquiry Schema Definition
 * 
 * This file contains the Zod schema specifically designed for admin operations on inquiry records. It provides a simplified interface for administrators to manage inquiry data without exposing service-specific fields.
 * 
 * Used in:
 * - Admin dashboard inquiry management forms
 * - inquiryActions.ts (createAdminInquiryAction, updateInquiryAction)
 * - Admin inquiry edit/create modals
 * - Admin API endpoints for inquiry CRUD operations
 * - Type safety for admin-specific inquiry operations
 */

import { z } from "zod";

/**
 * Admin inquiry schema for create/update operations
 * This schema contains only the fields that administrators can directly edit through the admin interface. 
 * Service-specific fields (workflows, project details, training requirements) are not included.
 */
export const adminInquirySchema = z.object({
  // Required user identification fields
  name: z.string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"), 
  email: z.string()
    .email("Invalid email address"), 
  affiliation: z.string()
    .min(1, "Affiliation is required")
    .max(200, "Affiliation must be at most 200 characters"), 
  designation: z.string()
    .min(1, "Designation is required")
    .max(100, "Designation must be at most 100 characters"), 
  
  // Administrative workflow status
  status: z.enum(['Pending', 'Approved Client', 'Quotation Only'], {
    required_error: "Status selection is required",
  }), 
});

export type AdminInquiryData = z.infer<typeof adminInquirySchema>;