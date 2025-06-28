// src/schemas/chargeSlipSchema.ts
import { z } from "zod";

export const chargeSlipSchema = z.object({
  projectId: z.string(),
  preparedBy: z.string(),
  dateIssued: z.date(),
  remarks: z.string().optional(),
  amount: z.number().min(0),
});

export type ChargeSlipFormData = z.infer<typeof chargeSlipSchema>;
