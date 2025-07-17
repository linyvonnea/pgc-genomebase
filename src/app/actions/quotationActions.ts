"use server";

import { revalidatePath } from "next/cache";
import { saveQuotationToFirestore, getAllQuotations } from "@/services/quotationService";
import { QuotationRecord } from "@/types/Quotation";

export async function saveQuotationAction(quotation: QuotationRecord) {
  try {
    await saveQuotationToFirestore(quotation);
    revalidatePath('/admin/quotations');
    revalidatePath('/admin/inquiries');
    return { success: true };
  } catch (error) {
    console.error("Error saving quotation:", error);
    return { success: false, error: "Failed to save quotation" };
  }
}

export async function getQuotationsAction() {
  try {
    const quotations = await getAllQuotations();
    return { success: true, data: quotations };
  } catch (error) {
    console.error("Error fetching quotations:", error);
    return { success: false, error: "Failed to fetch quotations" };
  }
}