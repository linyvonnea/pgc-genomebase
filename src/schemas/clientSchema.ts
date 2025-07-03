// src/schemas/clientSchema.ts
import { z } from "zod";

export const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  institution: z.string().min(1, "Institution is required"),
  designation: z.string().min(1, "Designation is required"),
  sex: z.enum(["Male", "Female", "Other"]),
 mobileNumber: z
  .string()
  .regex(/^\d{11}$/, "Enter a valid 11-digit number with no spaces"),
  institutionAddress: z.string().min(1, "Address is required"),
});

export type ClientFormData = z.infer<typeof clientSchema>;