/**
 * Inquiry Actions - Server-side functions for managing inquiries
 * 
 * This file contains Next.js server actions that handle CRUD operations
 * for user inquiries. These functions run on the server and interact with
 * Firestore database to create, read, update, and delete inquiry records.
 * 
 * Key Features:
 * - Creates inquiries from form submissions
 * - Sends automated emails via Firebase extensions
 * - Handles different service types (laboratory, research, training)
 * - Provides admin functions for inquiry management
 * - Automatic cache revalidation for data consistency
 */

'use server'

import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { revalidatePath } from "next/cache";
import { InquiryFormData } from "@/schemas/inquirySchema";
import { AdminInquiryData } from "@/schemas/adminInquirySchema";
import { logActivity } from "@/services/activityLogService";
import { initializeQuotationThread } from "@/services/quotationThreadService";

/**
 * Test function to validate email system configuration
 * This function helps diagnose email delivery issues by creating a simple test email
 */
export async function testEmailSystem() {
  try {
    console.log("=== EMAIL TEST: Starting email system test ===");
    
    // Check Firebase connection
    console.log("EMAIL TEST: Firebase DB:", db ? "Connected" : "Disconnected");
    
    // Create test email with both simple and template formats
    const testInquiryId = "TEST-" + Date.now();
    const testEmailData = {
      to: ["merlito.dayon@gmail.com"],
      inquiryId: testInquiryId, // Add at root level for easy searching
      message: {
        subject: "PGC Email System Test",
        text: "This is a test email from the PGC email system.",
        html: "<p><strong>PGC Email System Test</strong></p><p>This is a test email to verify email functionality.</p>"
      },
      template: {
        name: "inquiry-laboratory", // Using existing template
        data: {
          inquiryId: testInquiryId,
          name: "Test User",
          affiliation: "Test Institution", 
          designation: "Test Role",
          email: "test@example.com",
          service: "laboratory",
          workflows: "DNA extraction",
          additionalInfo: "This is a test email to verify email functionality"
        }
      }
    };

    console.log("EMAIL TEST: Test email structure:", {
      recipient: testEmailData.to,
      inquiryId: testEmailData.inquiryId,
      hasSubject: !!testEmailData.message.subject,
      hasTemplate: !!testEmailData.template,
      templateName: testEmailData.template.name,
      dataKeys: Object.keys(testEmailData.template.data)
    });

    console.log("EMAIL TEST: Creating test email document...");
    
    const mailCollection = collection(db, "mail");
    console.log("EMAIL TEST: Mail collection reference created");
    
    const emailDocRef = await addDoc(mailCollection, testEmailData);
    
    console.log("✅ EMAIL TEST SUCCESS: Test email document created!");
    console.log("Test Email Document ID:", emailDocRef.id);
    console.log("Test Email Document Path:", emailDocRef.path);
    
    // Immediately verify the document exists in Firestore
    try {
      const verifyDoc = await getDoc(emailDocRef);
      if (verifyDoc.exists()) {
        const docData = verifyDoc.data();
        console.log("✅ VERIFICATION: Document confirmed in Firestore!");
        console.log("Document data keys:", Object.keys(docData));
        console.log("Document inquiryId:", docData.inquiryId);
        console.log("Document to:", docData.to);
      } else {
        console.error("❌ VERIFICATION FAILED: Document not found in Firestore immediately after creation!");
      }
    } catch (verifyError) {
      console.error("❌ VERIFICATION ERROR:", verifyError);
    }
    
    return { 
      success: true, 
      emailDocId: emailDocRef.id,
      message: "Test email successfully created in Firestore 'mail' collection. Check Firebase Console for processing status." 
    };
    
  } catch (error) {
    console.error("❌ EMAIL TEST FAILED:", error);
    console.error("Test error details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code || "No code",
      stack: error instanceof Error ? error.stack : "No stack trace"
    });
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Email system test failed. Check Firebase configuration, extensions, and console logs for details." 
    };
  }
}

/**
 * Creates a new inquiry from user form submission
 * 
 * This function processes form data, transforms it for database storage,
 * saves it to Firestore, and triggers automated email notifications.
 */
export async function createInquiryAction(inquiryData: InquiryFormData) {
  try {
    // Check Firebase configuration first
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      console.error("Firebase project ID not found in environment variables");
      throw new Error("Firebase configuration error");
    }

    // Transform the form data to match the expected database structure
    // This ensures all required fields are present with proper defaults
    const currentDate = new Date();
    const transformedData = {
      // Core inquiry information
      name: inquiryData.name,
      affiliation: inquiryData.affiliation,
      designation: inquiryData.designation,
      email: inquiryData.email,
      
      // New Service Selection Fields
      species: inquiryData.species || null,
      otherSpecies: inquiryData.otherSpecies || null,
      researchOverview: inquiryData.researchOverview || null,
      methodologyFileUrl: inquiryData.methodologyFileUrl || null,
      sampleCount: inquiryData.sampleCount || null,
      workflowType: inquiryData.workflowType || null,
      individualAssayDetails: inquiryData.individualAssayDetails || null,
      
      // Service-specific fields (legacy - will be null for non-applicable services)
      // Laboratory Service fields
      workflows: inquiryData.workflows || [],
      additionalInfo: inquiryData.additionalInfo || null, 
      // Research service specific fields
      projectBackground: inquiryData.projectBackground || null, 
      projectBudget: inquiryData.projectBudget || null, 
      // Training service specific fields
      specificTrainingNeed: inquiryData.specificTrainingNeed || null,
      targetTrainingDate: inquiryData.targetTrainingDate || null,
      numberOfParticipants: inquiryData.numberOfParticipants || null,
      
      // System fields with defaults
      createdAt: serverTimestamp(),       // Firestore server timestamp
      status: 'Pending',                  // Default status for new inquiries
      isApproved: false,                  // Default approval status
      serviceType: inquiryData.service,   // Store the service type for reference
      haveSubmitted: false                // Track if user has submitted client-project form
    };

    // Add the inquiry document to the Firestore 'inquiries' collection
    const docRef = await addDoc(collection(db, "inquiries"), transformedData);
    
    // Initialize quotation thread for this inquiry
    // This creates the management thread for admin-client communication
    try {
      await initializeQuotationThread(docRef.id);
      console.log(`✅ Quotation thread initialized for inquiry ${docRef.id}`);
    } catch (threadError) {
      console.error(`⚠️ Failed to initialize quotation thread for inquiry ${docRef.id}:`, threadError);
      // Don't fail the inquiry creation if thread initialization fails
      // Admin can manually create thread later if needed
    }
    
    // Prepare email notification using Firebase Trigger Email extension
    // Template ID corresponds to service type for different email formats
    //NOTE: templates for email can be changed in the 'templates' collection in firebase
    const templateId = `inquiry-${inquiryData.service}`;
    
    // Create base template data that applies to all service types
    let templateData: Record<string, any> = {
      inquiryId: docRef.id, 
      name: inquiryData.name,
      affiliation: inquiryData.affiliation,
      designation: inquiryData.designation,
      email: inquiryData.email || '',
      service: inquiryData.service
    };

    // Add service-specific data to email template based on inquiry type
    if (['laboratory', 'bioinformatics', 'equipment', 'retail'].includes(inquiryData.service)) {
      // Laboratory services: include new comprehensive fields
      templateData.species = inquiryData.species || '';
      templateData.otherSpecies = inquiryData.otherSpecies || '';
      templateData.researchOverview = inquiryData.researchOverview || '';
      templateData.methodologyFileUrl = inquiryData.methodologyFileUrl || '';
      templateData.sampleCount = inquiryData.sampleCount?.toString() || '';
      templateData.workflowType = inquiryData.workflowType || '';
      templateData.individualAssayDetails = inquiryData.individualAssayDetails || '';
      // Legacy fields for backward compatibility
      templateData.workflows = Array.isArray(inquiryData.workflows) 
        ? inquiryData.workflows.join(', ') 
        : inquiryData.workflows || '';
      templateData.additionalInfo = inquiryData.additionalInfo || '';
    } else if (inquiryData.service === 'research') {
      // Research service: include project background and budget
      templateData.projectBackground = inquiryData.projectBackground || '';
      templateData.projectBudget = inquiryData.projectBudget || '';
    } else if (inquiryData.service === 'training') {
      // Training service: include training-specific details
      templateData.specificTrainingNeed = inquiryData.specificTrainingNeed || '';
      templateData.targetTrainingDate = inquiryData.targetTrainingDate || '';
      templateData.numberOfParticipants = inquiryData.numberOfParticipants?.toString() || '';
    }

    // === EMAIL NOTIFICATION SYSTEM ===
    // Create email document for Firebase Trigger Email extension
    // This document triggers Firebase extension to send email notifications
    
    console.log("=== EMAIL DEBUG: Starting email creation process ===");
    console.log("Inquiry ID:", docRef.id);
    console.log("Template ID:", templateId);
    console.log("Template Data:", templateData);
    console.log("Firebase DB instance:", db ? "Connected" : "Not Connected");
    
    // Validate that email recipient is configured
    const emailRecipient = "merlito.dayon@gmail.com";
    if (!emailRecipient) {
      console.error("EMAIL ERROR: No recipient configured");
      throw new Error("Email recipient not configured");
    }
    
    console.log("EMAIL DEBUG: Creating email for recipient:", emailRecipient);
    
    // Create a comprehensive HTML email body
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New ${inquiryData.service.charAt(0).toUpperCase() + inquiryData.service.slice(1)} Inquiry</h2>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Contact Information</h3>
          <p><strong>Name:</strong> ${inquiryData.name}</p>
          <p><strong>Email:</strong> ${inquiryData.email}</p>
          <p><strong>Affiliation:</strong> ${inquiryData.affiliation}</p>
          <p><strong>Designation:</strong> ${inquiryData.designation}</p>
        </div>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Service Details</h3>
          <p><strong>Service Type:</strong> ${inquiryData.service}</p>
          ${inquiryData.species ? `<p><strong>Species:</strong> ${inquiryData.species}${inquiryData.species === 'other' && inquiryData.otherSpecies ? ` (${inquiryData.otherSpecies})` : ''}</p>` : ''}
          ${inquiryData.researchOverview ? `<p><strong>Research Overview:</strong> ${inquiryData.researchOverview}</p>` : ''}
          ${inquiryData.methodologyFileUrl ? `<p><strong>Methodology File:</strong> ${inquiryData.methodologyFileUrl}</p>` : ''}
          ${inquiryData.sampleCount ? `<p><strong>Sample Count:</strong> ${inquiryData.sampleCount}</p>` : ''}
          ${inquiryData.workflowType ? `<p><strong>Workflow Type:</strong> ${inquiryData.workflowType === 'complete' ? 'Complete Workflow' : 'Individual Assay'}</p>` : ''}
          ${inquiryData.individualAssayDetails ? `<p><strong>Individual Assay Details:</strong> ${inquiryData.individualAssayDetails}</p>` : ''}
          ${inquiryData.workflows && inquiryData.workflows.length > 0 ? `<p><strong>Workflows:</strong> ${Array.isArray(inquiryData.workflows) ? inquiryData.workflows.join(', ') : inquiryData.workflows}</p>` : ''}
          ${inquiryData.additionalInfo ? `<p><strong>Additional Info:</strong> ${inquiryData.additionalInfo}</p>` : ''}
          ${inquiryData.projectBackground ? `<p><strong>Project Background:</strong> ${inquiryData.projectBackground}</p>` : ''}
          ${inquiryData.projectBudget ? `<p><strong>Project Budget:</strong> ${inquiryData.projectBudget}</p>` : ''}
          ${inquiryData.specificTrainingNeed ? `<p><strong>Training Need:</strong> ${inquiryData.specificTrainingNeed}</p>` : ''}
          ${inquiryData.targetTrainingDate ? `<p><strong>Training Date:</strong> ${inquiryData.targetTrainingDate}</p>` : ''}
          ${inquiryData.numberOfParticipants ? `<p><strong>Participants:</strong> ${inquiryData.numberOfParticipants}</p>` : ''}
        </div>
        
        <p style="color: #6b7280; font-size: 12px;">Inquiry ID: ${docRef.id}</p>
        <p style="color: #6b7280; font-size: 12px;">Submitted: ${new Date().toLocaleString()}</p>
      </div>
    `;
    
    // Create email text version
    const emailText = `
New ${inquiryData.service.charAt(0).toUpperCase() + inquiryData.service.slice(1)} Inquiry

Contact Information:
Name: ${inquiryData.name}
Email: ${inquiryData.email}
Affiliation: ${inquiryData.affiliation}
Designation: ${inquiryData.designation}

Service Type: ${inquiryData.service}
${inquiryData.workflows && inquiryData.workflows.length > 0 ? `Workflows: ${Array.isArray(inquiryData.workflows) ? inquiryData.workflows.join(', ') : inquiryData.workflows}\n` : ''}
${inquiryData.additionalInfo ? `Additional Info: ${inquiryData.additionalInfo}\n` : ''}
${inquiryData.projectBackground ? `Project Background: ${inquiryData.projectBackground}\n` : ''}
${inquiryData.projectBudget ? `Project Budget: ${inquiryData.projectBudget}\n` : ''}
${inquiryData.specificTrainingNeed ? `Training Need: ${inquiryData.specificTrainingNeed}\n` : ''}
${inquiryData.targetTrainingDate ? `Training Date: ${inquiryData.targetTrainingDate}\n` : ''}
${inquiryData.numberOfParticipants ? `Participants: ${inquiryData.numberOfParticipants}\n` : ''}

Inquiry ID: ${docRef.id}
Submitted: ${new Date().toLocaleString()}
    `.trim();
    
    // Create email document with simplified structure for better compatibility
    const emailData = {
      to: [emailRecipient],
      inquiryId: docRef.id, // Root level for easy searching
      message: {
        subject: `New ${inquiryData.service.charAt(0).toUpperCase() + inquiryData.service.slice(1)} Inquiry from ${inquiryData.name}`,
        text: emailText,
        html: emailHtml
      }
    };

    console.log("EMAIL DEBUG: Email document structure:", {
      recipient: emailData.to,
      inquiryId: emailData.inquiryId,
      hasSubject: !!emailData.message.subject,
      subjectLength: emailData.message.subject.length,
      htmlLength: emailData.message.html.length,
      textLength: emailData.message.text.length
    });

    // Attempt to create email document with enhanced error handling
    let emailDocumentCreated = false;
    let emailDocId = "";
    
    try {
      console.log("EMAIL DEBUG: Attempting to create email document...");
      console.log("EMAIL DEBUG: Firestore DB check:", {
        isDbDefined: !!db,
        dbType: typeof db,
        hasCollection: typeof collection === 'function',
        hasAddDoc: typeof addDoc === 'function'
      });
      
      // Check if Firestore connection is working
      const mailCollection = collection(db, "mail");
      console.log("EMAIL DEBUG: Mail collection reference created successfully");
      
      // Log the exact data being sent
      console.log("EMAIL DEBUG: Email data to be sent:", JSON.stringify({
        to: emailData.to,
        inquiryId: emailData.inquiryId,
        hasMessage: !!emailData.message,
        messageKeys: Object.keys(emailData.message)
      }, null, 2));
      
      // Create the email document
      console.log("EMAIL DEBUG: Calling addDoc...");
      const emailDocRef = await addDoc(mailCollection, emailData);
      emailDocumentCreated = true;
      emailDocId = emailDocRef.id;
      
      console.log("✅ EMAIL SUCCESS: Email document created!");
      console.log("Email Document ID:", emailDocRef.id);
      console.log("Email Document Path:", emailDocRef.path);
      console.log("Email Document Full Path:", `mail/${emailDocRef.id}`);
      
      // Immediately verify the document exists in Firestore
      console.log("EMAIL DEBUG: Starting immediate verification...");
      try {
        const verifyDoc = await getDoc(emailDocRef);
        if (verifyDoc.exists()) {
          const docData = verifyDoc.data();
          console.log("✅ VERIFICATION SUCCESS: Email document confirmed in Firestore!");
          console.log("Verified data:", {
            inquiryId: docData.inquiryId,
            recipient: docData.to,
            hasMessage: !!docData.message,
            subject: docData.message?.subject
          });
        } else {
          console.error("❌ VERIFICATION FAILED: Email document not found immediately after creation!");
          console.error("Expected document at:", `mail/${emailDocRef.id}`);
        }
      } catch (verifyError) {
        console.error("❌ VERIFICATION ERROR:", verifyError);
        console.error("Verify error details:", {
          name: verifyError instanceof Error ? verifyError.name : "Unknown",
          message: verifyError instanceof Error ? verifyError.message : String(verifyError)
        });
      }
      
      // Enhanced status checking with better error handling
      setTimeout(async () => {
        try {
          console.log("EMAIL DEBUG: Checking email document status after 5 seconds...");
          const emailDoc = await getDoc(doc(db, "mail", emailDocRef.id));
          
          if (emailDoc.exists()) {
            const emailStatus = emailDoc.data();
            console.log("EMAIL STATUS AFTER 5s:", JSON.stringify(emailStatus, null, 2));
            
            // Check for delivery status
            if (emailStatus.delivery) {
              if (emailStatus.delivery.state === 'SUCCESS') {
                console.log("✅ EMAIL DELIVERED: Email sent successfully!");
              } else if (emailStatus.delivery.state === 'ERROR') {
                console.error("❌ EMAIL DELIVERY FAILED:", emailStatus.delivery.error);
              } else {
                console.log("📧 EMAIL PENDING: Email state:", emailStatus.delivery.state);
              }
            } else {
              console.log("⏳ EMAIL PENDING: No delivery status yet (still processing)");
            }
          } else {
            console.log("⚠️ EMAIL WARNING: Email document no longer exists (may have been processed and deleted by extension)");
          }
        } catch (checkError) {
          console.error("EMAIL DEBUG ERROR: Could not check email status:", checkError);
        }
      }, 5000);
      
    } catch (emailError) {
      console.error("❌ EMAIL CREATION FAILED:", emailError);
      console.error("Error type:", typeof emailError);
      console.error("Error constructor:", emailError?.constructor?.name);
      console.error("Full error object:", JSON.stringify(emailError, Object.getOwnPropertyNames(emailError)));
      console.error("Error details:", {
        name: emailError instanceof Error ? emailError.name : "Unknown",
        message: emailError instanceof Error ? emailError.message : String(emailError),
        code: (emailError as any)?.code || "No code",
        stack: emailError instanceof Error ? emailError.stack : "No stack trace"
      });
      
      // Log additional debugging information
      console.log("EMAIL DEBUG: Failure context:", {
        hasDB: !!db,
        dbType: typeof db,
        hasCollection: typeof collection === 'function',
        hasAddDoc: typeof addDoc === 'function',
        emailDataSize: JSON.stringify(emailData).length,
        emailDataKeys: Object.keys(emailData),
        timestamp: new Date().toISOString(),
        inquiryIdExists: !!docRef.id
      });
      
      // Don't throw error - allow inquiry creation to continue
      console.log("EMAIL DEBUG: Continuing with inquiry creation despite email failure");
      
      // Return inquiry success but note email failure
      revalidatePath('/admin/inquiry');
      return { 
        success: true, 
        inquiryId: docRef.id,
        emailSent: false,
        message: "Inquiry submitted successfully, but email notification failed. Admin will be notified manually.",
        error: emailError instanceof Error ? emailError.message : String(emailError)
      };
    }
    
    console.log("=== EMAIL DEBUG: Email process completed ===");
    console.log("Email document created:", emailDocumentCreated);
    console.log("Email document ID:", emailDocId);
    
    // Revalidate the admin inquiry page cache to show new data immediately
    // This ensures the admin sees the new inquiry without page refresh
    revalidatePath('/admin/inquiry');
    
    return { 
      success: true, 
      inquiryId: docRef.id,
      emailSent: emailDocumentCreated,
      emailDocId: emailDocId,
      message: emailDocumentCreated 
        ? `Inquiry submitted successfully! Email notification sent to ${emailRecipient}. Email ID: ${emailDocId}`
        : "Inquiry submitted successfully, but email notification may not have been sent."
    };
  } catch (error) {
    console.error("Error creating inquiry:", error);
    throw new Error("Failed to create inquiry");
  }
}

/**
 * Creates a new inquiry directly from admin interface
 * 
 * This function allows administrators to manually create inquiry records
 * without going through the public form submission process.
 * 
 * Note: This creates a minimal inquiry record with default values for
 * service-specific fields since it's created by admin, not user submission.
 */
export async function createAdminInquiryAction(data: AdminInquiryData, userInfo?: { name: string; email: string }) {
  try {
    // Transform admin data to database format with defaults for service fields
    const transformedData = {
      // Core fields from admin form
      name: data.name,
      email: data.email,
      affiliation: data.affiliation,
      designation: data.designation,
      status: data.status,
      isApproved: data.status === 'Approved Client', // Auto-approve if status is 'Approved Client'
      createdAt: serverTimestamp(),
      haveSubmitted: false,
      
      // Default values for service-specific fields since this is admin-created
      workflows: [], 
      additionalInfo: null,
      projectBackground: null,
      projectBudget: null,
      specificTrainingNeed: null,
      targetTrainingDate: null,
      numberOfParticipants: null,
      serviceType: null 
    };

    // Add the inquiry document to Firestore
    const docRef = await addDoc(collection(db, "inquiries"), transformedData);
    
    // Log the activity
    await logActivity({
      userId: userInfo?.email || "system",
      userEmail: userInfo?.email || "system@pgc.admin",
      userName: userInfo?.name || "System",
      action: "CREATE",
      entityType: "inquiry",
      entityId: docRef.id,
      entityName: data.name,
      description: `Created inquiry for ${data.name}`,
      changesAfter: transformedData,
    });
    
    // Revalidate the admin inquiry page to show the new entry
    revalidatePath('/admin/inquiry');
    
    return { success: true, inquiryId: docRef.id };
  } catch (error) {
    console.error("Error creating inquiry:", error);
    throw new Error("Failed to create inquiry");
  }
}

/**
 * Updates an existing inquiry record
 * 
 * This function allows administrators to modify inquiry details,
 * including status changes and approval status updates.
 * 
 * Note: Only updates core fields that can be modified by admin.
 * Service-specific fields are preserved from original submission.
 */
export async function updateInquiryAction(
  id: string,
  data: AdminInquiryData,
  userInfo?: { name: string; email: string }
) {
  try {
    // Create reference to the specific inquiry document
    const docRef = doc(db, "inquiries", id);
    
    // Get old data for logging
    const oldDoc = await getDoc(docRef);
    const oldData = oldDoc.exists() ? oldDoc.data() : null;
    
    const updateData = {
      name: data.name,
      email: data.email,
      affiliation: data.affiliation,
      designation: data.designation,
      status: data.status,
      isApproved: data.status === 'Approved Client',
    };
    
    // Update only the editable fields
    await updateDoc(docRef, updateData);
    
    // Log the activity
    await logActivity({
      userId: userInfo?.email || "system",
      userEmail: userInfo?.email || "system@pgc.admin",
      userName: userInfo?.name || "System",
      action: "UPDATE",
      entityType: "inquiry",
      entityId: id,
      entityName: data.name,
      description: `Updated inquiry for ${data.name}`,
      changesBefore: oldData || undefined,
      changesAfter: { ...oldData, ...updateData },
      changedFields: Object.keys(updateData),
    });
    
    // Revalidate the admin inquiry page to reflect changes
    revalidatePath('/admin/inquiry');
    
    return { success: true };
  } catch (error) {
    console.error("Error updating inquiry:", error);
    throw new Error('Failed to update inquiry');
  }
}

/**
 * Deletes an inquiry record from the database
 * 
 * This function permanently removes an inquiry document from Firestore.
 * Use with caution as this operation cannot be undone.
 * 
 */
export async function deleteInquiryAction(id: string, userInfo?: { name: string; email: string }) {
  try {
    // Create reference to the specific inquiry document
    const docRef = doc(db, "inquiries", id);
    
    // Get data before deletion for logging
    const docSnap = await getDoc(docRef);
    const inquiryData = docSnap.exists() ? docSnap.data() : null;
    
    // Permanently delete the document from Firestore
    await deleteDoc(docRef);
    
    // Log the activity
    await logActivity({
      userId: userInfo?.email || "system",
      userEmail: userInfo?.email || "system@pgc.admin",
      userName: userInfo?.name || "System",
      action: "DELETE",
      entityType: "inquiry",
      entityId: id,
      entityName: inquiryData?.name || "Unknown",
      description: `Deleted inquiry for ${inquiryData?.name || id}`,
      changesBefore: inquiryData || undefined,
    });
    
    // Revalidate the admin inquiry page to remove the deleted entry
    revalidatePath('/admin/inquiry');
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting inquiry:", error);
    throw new Error('Failed to delete inquiry');
  }
}