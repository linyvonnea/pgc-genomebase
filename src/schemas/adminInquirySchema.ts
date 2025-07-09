import { z } from "zod";

export const adminInquirySchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  email: z.string().email("Invalid email address"),
  affiliation: z.string().min(1, "Affiliation is required").max(200, "Affiliation must be at most 200 characters"),
  designation: z.string().min(1, "Designation is required").max(100, "Designation must be at most 100 characters"),
  status: z.enum(['Pending', 'Approved Client', 'Quotation Only']),
});

export type AdminInquiryData = z.infer<typeof adminInquirySchema>;