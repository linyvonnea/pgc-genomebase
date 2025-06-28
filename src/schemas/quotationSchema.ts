// src/schemas/quotationSchema.ts
import { z } from "zod";

const quotationItemSchema = z.object({
  serviceName: z.string(),
  quantity: z.number().min(1),
  unit: z.string(),
  unitCost: z.number().min(0),
  subtotal: z.number().min(0),
});

export const quotationSchema = z.object({
  clientId: z.string(),
  type: z.enum(["Laboratory", "Equipment"]),
  items: z.array(quotationItemSchema).min(1),
  total: z.number().min(0),
  status: z.enum(["draft", "submitted", "reviewed", "approved"]),
  generatedAt: z.date(),
});

export type QuotationFormData = z.infer<typeof quotationSchema>;
