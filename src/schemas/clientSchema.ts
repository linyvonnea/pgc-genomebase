import { z } from "zod";

export const clientFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  affiliation: z.string().min(1, "Affiliation is required"),
  designation: z.string().min(1, "Designation is required"),
  sex: z.enum(["F", "M", "Other"]),
  phoneNumber: z
    .string()
    .regex(/^[0-9]{11}$/, "Enter a valid 11-digit number with no spaces"),
  affiliationAddress: z.string().min(1, "Address is required"),
});

export type ClientFormData = z.infer<typeof clientFormSchema>;

// Full schema for Firestore/admin table
export const clientSchema = z.object({
  affiliation: z.string().nullable().optional(),
  affiliationAddress: z.string().nullable().optional(),
  cid: z.string().nullable().optional(),
  createdAt: z.date().or(z.string()).nullable().optional(),
  designation: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  haveSubmitted: z.boolean().or(z.string()).nullable().optional(),
  isContactPerson: z.boolean().or(z.string()).nullable().optional(),
  name: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  pid: z.union([z.string(), z.array(z.string())]).nullable().optional(),
  projectName: z.string().nullable().optional(),
  sex: z.enum(["F", "M", "Other", ""]).nullable().optional(),
  year: z.number().or(z.string()).nullable().optional(),
});