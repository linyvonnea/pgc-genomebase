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
    const testEmailData = {
      to: ["madayon1@up.edu.ph"],
      message: {
        subject: "PGC Email System Test",
        text: "This is a test email from the PGC email system.",
        html: "<p><strong>PGC Email System Test</strong></p><p>This is a test email to verify email functionality.</p>"
      },
      template: {
        name: "inquiry-laboratory", // Using existing template
        data: {
          inquiryId: "TEST-" + Date.now(),
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
    
    return { 
      success: true, 
      emailDocId: emailDocRef.id,
      message: "Test email successfully created in Firestore 'mail' collection. Check Firebase Console for processing status." 
    };
    
  } catch (error) {
    console.error("❌ EMAIL TEST FAILED:", error);
    console.error("Test error details:", {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
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
      
      // Service-specific fields (will be null for non-applicable services)
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
    if (inquiryData.service === 'laboratory') {
      // Laboratory service: include workflows and additional info
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
    console.log("Template ID:", templateId);
    console.log("Template Data:", templateData);
    console.log("Firebase DB instance:", db ? "Connected" : "Not Connected");
    
    // Validate that email recipient is configured
    const emailRecipient = "madayon1@up.edu.ph";
    if (!emailRecipient) {
      console.error("EMAIL ERROR: No recipient configured");
      throw new Error("Email recipient not configured");
    }
    
    // Create email document with proper structure for Firebase Trigger Email
    const emailData = {
      to: [emailRecipient],
      message: {
        subject: `New ${inquiryData.service} Inquiry from ${inquiryData.name}`,
        text: `New inquiry received from ${inquiryData.name} (${inquiryData.email}) for ${inquiryData.service} service.`,
        html: `<p>New inquiry received from <strong>${inquiryData.name}</strong> (${inquiryData.email}) for ${inquiryData.service} service.</p>`
      },
      template: {
        name: templateId,
        data: templateData
      }
    };

    console.log("EMAIL DEBUG: Email document structure:", {
      recipient: emailData.to,
      hasSubject: !!emailData.message.subject,
      hasTemplate: !!emailData.template,
      templateName: emailData.template.name,
      templateDataKeys: Object.keys(templateData),
      inquiryId: docRef.id
    });

    // Attempt to create email document with enhanced error handling
    try {
      console.log("EMAIL DEBUG: Attempting to create email document...");
      
      // Check if Firestore connection is working
      const mailCollection = collection(db, "mail");
      console.log("EMAIL DEBUG: Mail collection reference created");
      
      // Create the email document
      const emailDocRef = await addDoc(mailCollection, emailData);
      
      console.log("✅ EMAIL SUCCESS: Email document created!");
      console.log("Email Document ID:", emailDocRef.id);
      console.log("Email Document Path:", emailDocRef.path);
      
      // Enhanced status checking with better error handling
      setTimeout(async () => {
        try {
          console.log("EMAIL DEBUG: Checking email document status...");
          const emailDoc = await getDoc(doc(db, "mail", emailDocRef.id));
          
          if (emailDoc.exists()) {
            const emailStatus = emailDoc.data();
            console.log("EMAIL STATUS:", emailStatus);
            
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
            console.log("⚠️ EMAIL WARNING: Email document no longer exists (may have been processed)");
          }
        } catch (checkError) {
          console.error("EMAIL DEBUG ERROR: Could not check email status:", checkError);
        }
      }, 5000);
      
    } catch (emailError) {
      console.error("❌ EMAIL CREATION FAILED:", emailError);
      console.error("Error details:", {
        name: emailError.name,
        message: emailError.message,
        code: emailError.code,
        stack: emailError.stack
      });
      
      // Log additional debugging information
      console.log("EMAIL DEBUG: Failure context:", {
        hasDB: !!db,
        hasCollection: !!collection,
        hasAddDoc: !!addDoc,
        emailDataSize: JSON.stringify(emailData).length,
        timestamp: new Date().toISOString()
      });
      
      // Don't throw error - allow inquiry creation to continue
      console.log("EMAIL DEBUG: Continuing with inquiry creation despite email failure");
    }
    
    console.log("=== EMAIL DEBUG: Email process completed ===");
    
    // Revalidate the admin inquiry page cache to show new data immediately
    // This ensures the admin sees the new inquiry without page refresh
    revalidatePath('/admin/inquiry');
    
    return { success: true, inquiryId: docRef.id };
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