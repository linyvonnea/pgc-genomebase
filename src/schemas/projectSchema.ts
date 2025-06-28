// src/schemas/projectSchema.ts
import { z } from "zod";

export const projectSchema = z.object({
  clientId: z.string().min(1),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["pending", "ongoing", "completed"]),
  startDate: z.date(),
  endDate: z.date().nullable(),
});

export type ProjectFormData = z.infer<typeof projectSchema>;
