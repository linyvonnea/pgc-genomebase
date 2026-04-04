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

    // Send billing email notification to client
    const clientEmail = slip.clientInfo?.email;
    const clientName = slip.clientInfo?.name || slip.client?.name || "Client";
    if (clientEmail) {
      try {
        const mailCollection = collection(db, "mail");

        const billingEmailHtml = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; color: #334155; line-height: 1.6;">
              <div style="background-color: #f1f5f9; padding: 24px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <h2 style="color: #1e3a8a; margin-top: 0;">Billing/Invoice - PGC Visayas</h2>
                <p>Dear ${clientName},</p>
                <p>Good day. Your billing is now available in your client portal. Kindly review the details and proceed with payment at your convenience. For available modes of payment and step-by-step instructions, please refer to our FAQs.</p>

                <div style="background-color: #ffffff; padding: 15px; border-radius: 6px; border-left: 4px solid #1e3a8a; margin: 15px 0;">
                  <h3 style="margin-top: 0; color: #1e3a8a; font-size: 14px; margin-bottom: 8px;">Next Steps</h3>
                  <p style="margin-bottom: 12px; font-size: 14px;">View your billing and proceed with payment via the Client Portal.</p>
                  <p style="margin: 0;"><a href="https://pgc-genomebase.vercel.app/portal" style="background-color: #1e3a8a; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: 600; font-size: 13px;">Access Client Portal</a></p>
                </div>

                <p>Once payment has been completed, please send us a copy of the official receipt for verification. Kindly note that results will be released upon confirmation of payment.</p>
                <p>If you have any questions regarding the billing or encounter any issues with the portal, please feel free to reach out. We look forward to working with you.</p>

                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">Yours in utilizing OMICS for a better Philippines,<br /><strong>Philippine Genome Center Visayas</strong></p>
              </div>
            </div>
          `;

        const billingEmailText = `
Billing/Invoice - PGC Visayas

Dear ${clientName},

Good day. Your billing is now available in your client portal. Kindly review the details and proceed with payment at your convenience. For available modes of payment and step-by-step instructions, please refer to our FAQs.

Once payment has been completed, please send us a copy of the official receipt for verification. Kindly note that results will be released upon confirmation of payment.

If you have any questions regarding the billing or encounter any issues with the portal, please feel free to reach out. We look forward to working with you.

Access Client Portal: https://pgc-genomebase.vercel.app/portal

Yours in utilizing OMICS for a better Philippines,
Philippine Genome Center Visayas
        `.trim();

        await addDoc(mailCollection, {
          to: [clientEmail],
          message: {
            subject: "Billing/Invoice: PGC Visayas",
            text: billingEmailText,
            html: billingEmailHtml,
          },
        });
        console.log(`✅ Billing email sent to ${clientEmail}`);
      } catch (emailError) {
        console.warn("Could not send billing email:", emailError);
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
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to save charge slip" 
    };
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