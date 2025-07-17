"use server";

import { revalidatePath } from "next/cache";
import { 
  saveChargeSlip, 
  updateChargeSlip, 
  getAllChargeSlips 
} from "@/services/chargeSlipService";
import { ChargeSlipRecord } from "@/types/ChargeSlipRecord";

export async function saveChargeSlipAction(slip: ChargeSlipRecord) {
  try {
    const result = await saveChargeSlip(slip);
    revalidatePath('/admin/charge-slips');
    revalidatePath('/admin/projects');
    return { success: true, data: result };
  } catch (error) {
    console.error("Error saving charge slip:", error);
    return { success: false, error: "Failed to save charge slip" };
  }
}

export async function updateChargeSlipAction(id: string, updates: Partial<ChargeSlipRecord>) {
  try {
    await updateChargeSlip(id, updates);
    revalidatePath('/admin/charge-slips');
    revalidatePath(`/admin/charge-slips/${id}`);
    return { success: true };
  } catch (error) {
    console.error("Error updating charge slip:", error);
    return { success: false, error: "Failed to update charge slip" };
  }
}

export async function getChargeSlipsAction() {
  try {
    const chargeSlips = await getAllChargeSlips();
    return { success: true, data: chargeSlips };
  } catch (error) {
    console.error("Error fetching charge slips:", error);
    return { success: false, error: "Failed to fetch charge slips" };
  }
}