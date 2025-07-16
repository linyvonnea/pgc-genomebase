
import { z } from "zod";

export const clientFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  affiliation: z.string().min(1, "Affiliation is required"),
  designation: z.string().min(1, "Designation is required"),
  sex: z.enum(["F", "M", "Other"]),
  phoneNumber: z
  .string()
  .regex(/^\d{11}$/, "Enter a valid 11-digit number with no spaces"),
  affiliationAddress: z.string().min(1, "Address is required"),
});

export type ClientFormData = z.infer<typeof clientSchema>;

// Full schema for Firestore/admin table
export const clientSchema = z.object({
  affiliation: z.string().optional(),
  affiliationAddress: z.string().optional(),
  cid: z.string().optional(),
  createdAt: z.date().optional(),
  designation: z.string().optional(),
  email: z.string().optional(),
  haveSubmitted: z.boolean().optional(),
  isContactPerson: z.boolean().optional(),
  name: z.string().optional(),
  phoneNumber: z.string().optional(),
  pid: z.string().optional(),
  projectName: z.string().optional(),
  sex: z.enum(["F", "M", "Other"]),
  year: z.number().optional()

});