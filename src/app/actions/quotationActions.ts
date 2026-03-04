"use server";

import { revalidatePath } from "next/cache";
import { saveQuotationToFirestore, getAllQuotations } from "@/services/quotationService";
import { updateInquiryStatus, getInquiryById } from "@/services/inquiryService";
import { QuotationRecord } from "@/types/Quotation";
import { logActivity } from "@/services/activityLogService";
import { sanitizeObject } from "@/lib/sanitizeObject";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function saveQuotationAction(
  quotation: QuotationRecord,
  userInfo: { name: string; email: string }
) {
  try {
    const cleanedQuotation = sanitizeObject(quotation) as QuotationRecord;
    await saveQuotationToFirestore(cleanedQuotation);

    // Automatically update inquiry status from "Pending" to "Ongoing Quotation"
    if (quotation.inquiryId) {
      try {
        await updateInquiryStatus(quotation.inquiryId, "Ongoing Quotation");

        // Send email to client about quotation availability
        const inquiry = await getInquiryById(quotation.inquiryId);
        if (inquiry && inquiry.email) {
          const mailCollection = collection(db, "mail");
          
          const clientEmailHtml = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; color: #334155; line-height: 1.6;">
              <div style="background-color: #f1f5f9; padding: 24px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <h2 style="color: #1e3a8a; margin-top: 0;">Quotation Available - PGC Visayas</h2>
                <p>Dear ${inquiry.name},</p>
                <p>Your quotation is now available in your client portal. Please note that the quotation does not include re-runs for unsuccessful samples. Make sure to read our FAQs for details about turnaround time, sample submission, and payment details.</p>
                
                <div style="background-color: #ffffff; padding: 20px; border-radius: 6px; border-left: 4px solid #1e3a8a; margin: 24px 0;">
                  <h3 style="margin-top: 0; color: #1e3a8a; font-size: 16px;">Next Steps</h3>
                  <p style="margin-bottom: 16px;">To view the quotation and progress of requested services, kindly log in to your Client Portal.</p>
                  <p><a href="https://pgc-genomebase.com/portal" style="background-color: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: 600;">Access Client Portal</a></p>
                </div>

                <p>If you'd like to proceed with the service, please complete the client and project details in the portal and submit for admin review. Kindly wait for a confirmation if your project has been approved before scheduling any laboratory use or sending samples.</p>
                
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">Yours in utilizing OMICS for a better Philippines,<br /><strong>Philippine Genome Center Visayas</strong></p>
              </div>
            </div>
          `;

          const clientEmailText = `
Quotation Available - PGC Visayas

Dear ${inquiry.name},

Your quotation is now available in your client portal. Please note that the quotation does not include re-runs for unsuccessful samples. Make sure to read our FAQs for details about turnaround time, sample submission, and payment details.

To view the quotation and progress of requested services, kindly log in to your Client Portal: https://pgc-genomebase.com/portal

If you'd like to proceed with the service, please complete the client and project details in the portal and submit for admin review. Kindly wait for a confirmation if your project has been approved before scheduling any laboratory use or sending samples.

Yours in utilizing OMICS for a better Philippines,
Philippine Genome Center Visayas
          `.trim();

          await addDoc(mailCollection, {
            to: [inquiry.email],
            message: {
              subject: "Quotation Available: PGC Visayas",
              text: clientEmailText,
              html: clientEmailHtml
            }
          });
          console.log(`✅ Quotation availability email sent to ${inquiry.email}`);
        }
      } catch (statusError) {
        console.warn("Could not handle inquiry update or email:", statusError);
      }
    }

    // Log the activity
    await logActivity({
      userId: userInfo.email,
      userEmail: userInfo.email,
      userName: userInfo.name,
      action: "GENERATE",
      entityType: "quotation",
      entityId: quotation.referenceNumber || quotation.id || "unknown",
      entityName: `Quotation for ${quotation.name || "Unknown Client"}`,
      description: `Generated quotation: ${quotation.referenceNumber || quotation.id}`,
      changesAfter: quotation,
    });

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