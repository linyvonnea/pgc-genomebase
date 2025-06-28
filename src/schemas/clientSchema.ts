// src/schemas/clientSchema.ts
import { z } from "zod";

export const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  institution: z.string().min(1, "Institution is required"),
  designation: z.string().optional(),
  sex: z.enum(["Male", "Female", "Other"]),
  mobileNumber: z.string().min(11, "Enter a valid number"),
  mailingAddress: z.string().optional(),
});

export type ClientFormData = z.infer<typeof clientSchema>;