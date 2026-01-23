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
 * Creates a new inquiry from user form submission
 * 
 * This function processes form data, transforms it for database storage,
 * saves it to Firestore, and triggers automated email notifications.
 */
export async function createInquiryAction(inquiryData: InquiryFormData) {
  try {
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

    // Create email document for Firebase Trigger Email extension
    // This document in the 'mail' collection triggers the email sending
    const emailData = {
      to: ["dbduran@up.edu.ph"], // Admin email address that receives all inquiries
      template: {
        name: templateId,       // Template name for service-specific formatting
        data: templateData      // All the inquiry data for email content
      }
    };

    // Add email to the mail collection to trigger the Firebase extension
    await addDoc(collection(db, "mail"), emailData);
    
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
export async function createAdminInquiryAction(data: AdminInquiryData) {
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
      userId: "system",
      userEmail: "system@pgc.admin",
      userName: "System",
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
export async function updateInquiryAction(id: string, data: AdminInquiryData) {
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
      userId: "system",
      userEmail: "system@pgc.admin",
      userName: "System",
      action: "UPDATE",
      entityType: "inquiry",
      entityId: id,
      entityName: data.name,
      description: `Updated inquiry for ${data.name}`,
      changesBefore: oldData,
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
export async function deleteInquiryAction(id: string) {
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
      userId: "system",
      userEmail: "system@pgc.admin",
      userName: "System",
      action: "DELETE",
      entityType: "inquiry",
      entityId: id,
      entityName: inquiryData?.name || "Unknown",
      description: `Deleted inquiry for ${inquiryData?.name || id}`,
      changesBefore: inquiryData,
    });
    
    // Revalidate the admin inquiry page to remove the deleted entry
    revalidatePath('/admin/inquiry');
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting inquiry:", error);
    throw new Error('Failed to delete inquiry');
  }
}