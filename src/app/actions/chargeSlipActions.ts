"use server";

import { revalidatePath } from "next/cache";
import { 
  saveChargeSlip, 
  updateChargeSlip, 
  getAllChargeSlips 
} from "@/services/chargeSlipService";
import { ChargeSlipRecord } from "@/types/ChargeSlipRecord";
import { logActivity } from "@/services/activityLogService";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function saveChargeSlipAction(
  slip: ChargeSlipRecord,
  userInfo?: { name: string; email: string }
) {
  try {
    const result = await saveChargeSlip(slip);
    
    // Send email to client
    if (slip.clientInfo?.email) {
      try {
        const mailCollection = collection(db, "mail");
        
        const clientEmailHtml = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; color: #334155; line-height: 1.6;">
            <div style="background-color: #f1f5f9; padding: 24px; border-radius: 8px; border: 1px solid #e2e8f0;">
              <h2 style="color: #1e3a8a; margin-top: 0;">Billing/Invoice - PGC Visayas</h2>
              <p>Dear ${slip.clientInfo.name},</p>
              <p>Good day. Your billing is now available in your client portal. Kindly review the details and proceed with payment at your convenience. For available modes of payment and step-by-step instructions, please refer to our FAQs.</p>
              
              <div style="background-color: #ffffff; padding: 15px; border-radius: 6px; border-left: 4px solid #1e3a8a; margin: 15px 0;">
                <p style="margin: 0; font-size: 14px;">Once payment has been completed, please send us a copy of the official receipt for verification. <strong>Kindly note that results will be released upon confirmation of payment.</strong></p>
              </div>

              <p>If you'd like to view your billing, access the portal below:</p>
              <p style="margin: 20px 0;"><a href="https://pgc-genomebase.vercel.app/portal" style="background-color: #1e3a8a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: 600;">Access Client Portal</a></p>

              <p>If you have any questions regarding the billing or encounter any issues with the portal, please feel free to reach out. We look forward to working with you.</p>
              
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
              <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">Yours in utilizing OMICS for a better Philippines,<br /><strong>Philippine Genome Center Visayas</strong></p>
            </div>
          </div>
        `;

        await addDoc(mailCollection, {
          to: slip.clientInfo.email,
          message: {
            subject: `Billing/Invoice: ${slip.chargeSlipNumber}`,
            html: clientEmailHtml,
          },
          createdAt: new Date(),
        });
      } catch (emailError) {
        console.error("Failed to send charge slip email notification:", emailError);
      }
    }
    
    // Log the activity
    await logActivity({
      userId: userInfo?.email || "system",
      userEmail: userInfo?.email || "system@pgc.admin",
      userName: userInfo?.name || "System",
      action: "GENERATE",
      entityType: "charge_slip",
      entityId: slip.referenceNumber || slip.id || "unknown",
      entityName: `Charge Slip for ${slip.projectId || "Unknown Project"}`,
      description: `Generated charge slip: ${slip.referenceNumber || slip.id}`,
      changesAfter: slip,
    });
    
    revalidatePath('/admin/charge-slips');
    revalidatePath('/admin/projects');
    return { success: true, data: result };
  } catch (error) {
    console.error("Error saving charge slip:", error);
    return { success: false, error: "Failed to save charge slip" };
  }
}

export async function updateChargeSlipAction(
  id: string,
  updates: Partial<ChargeSlipRecord>,
  userInfo?: { name: string; email: string }
) {
  try {
    await updateChargeSlip(id, updates);
    
    // Log the activity
    await logActivity({
      userId: userInfo?.email || "system",
      userEmail: userInfo?.email || "system@pgc.admin",
      userName: userInfo?.name || "System",
      action: "UPDATE",
      entityType: "charge_slip",
      entityId: id,
      entityName: `Charge Slip ${id}`,
      description: `Updated charge slip: ${id}`,
      changesAfter: updates,
      changedFields: Object.keys(updates),
    });
    
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