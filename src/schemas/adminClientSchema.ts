import { z } from "zod";

export const adminClientSchema = z.object({
  pid: z.string().min(1, "Project ID is required"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  affiliation: z.string().min(1, "Affiliation is required"),
  designation: z.string().min(1, "Designation is required"),
  sex: z.enum(["F", "M", "Other"]),
  phoneNumber: z.string().regex(/^\d{11}$/, "Enter a valid 11-digit number with no spaces"),
  //affiliationAddress: z.string().min(1, "Address is required"),
});

export type AdminClientData = z.infer<typeof adminClientSchema>;
