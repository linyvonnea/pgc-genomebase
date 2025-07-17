'use server'

import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { revalidatePath } from "next/cache";
import { InquiryFormData } from "@/schemas/inquirySchema";
import { AdminInquiryData } from "@/schemas/adminInquirySchema";

export async function createInquiryAction(inquiryData: InquiryFormData) {
  try {
    // Transform the form data to match the expected database structure
    const currentDate = new Date();
    
    const transformedData = {
      name: inquiryData.name,
      affiliation: inquiryData.affiliation,
      designation: inquiryData.designation,
      email: inquiryData.email || null,
      workflows: inquiryData.workflows || [],
      additionalInfo: inquiryData.additionalInfo || null,
      projectBackground: inquiryData.projectBackground || null,
      projectBudget: inquiryData.projectBudget || null,
      // Add the new training service fields
      specificTrainingNeed: inquiryData.specificTrainingNeed || null,
      targetTrainingDate: inquiryData.targetTrainingDate || null,
      numberOfParticipants: inquiryData.numberOfParticipants || null,
      createdAt: serverTimestamp(),
      status: 'Pending',
      isApproved: false,
      // Store the service type for reference if needed
      serviceType: inquiryData.service,
      // Add the haveSubmitted field (default false)
      haveSubmitted: false
    };

    // Add the inquiry document to the database
    const docRef = await addDoc(collection(db, "inquiries"), transformedData);
    
    // Prepare email data for Firebase Trigger Email extension
    const templateId = `inquiry-${inquiryData.service}`;
    
    // Create template data based on service type
    let templateData: Record<string, any> = {
      inquiryId: docRef.id,
      name: inquiryData.name,
      affiliation: inquiryData.affiliation,
      designation: inquiryData.designation,
      email: inquiryData.email || '',
      service: inquiryData.service
    };

    // Add service-specific data
    if (inquiryData.service === 'laboratory') {
      templateData.workflows = Array.isArray(inquiryData.workflows) 
        ? inquiryData.workflows.join(', ') 
        : inquiryData.workflows || '';
      templateData.additionalInfo = inquiryData.additionalInfo || '';
    } else if (inquiryData.service === 'research') {
      templateData.projectBackground = inquiryData.projectBackground || '';
      templateData.projectBudget = inquiryData.projectBudget || '';
    } else if (inquiryData.service === 'training') {
      templateData.specificTrainingNeed = inquiryData.specificTrainingNeed || '';
      templateData.targetTrainingDate = inquiryData.targetTrainingDate || '';
      templateData.numberOfParticipants = inquiryData.numberOfParticipants?.toString() || '';
    }

    // Create email document for Firebase Trigger Email extension
    const emailData = {
      to: ["dbduran@up.edu.ph"],
      template: {
        name: templateId,
        data: templateData
      }
    };

    // Add email to the mail collection to trigger the extension
    await addDoc(collection(db, "mail"), emailData);
    
    // Revalidate the admin inquiry page to show new data
    revalidatePath('/admin/inquiry');
    
    return { success: true, inquiryId: docRef.id };
  } catch (error) {
    console.error("Error creating inquiry:", error);
    throw new Error("Failed to create inquiry");
  }
}

export async function createAdminInquiryAction(data: AdminInquiryData) {
  try {
    const transformedData = {
      name: data.name,
      email: data.email,
      affiliation: data.affiliation,
      designation: data.designation,
      status: data.status,
      isApproved: data.status === 'Approved Client',
      createdAt: serverTimestamp(),
      haveSubmitted: false,
      workflows: [],
      additionalInfo: null,
      projectBackground: null,
      projectBudget: null,
      specificTrainingNeed: null,
      targetTrainingDate: null,
      numberOfParticipants: null,
      serviceType: null
    };

    const docRef = await addDoc(collection(db, "inquiries"), transformedData);
    
    // Revalidate the admin inquiry page
    revalidatePath('/admin/inquiry');
    
    return { success: true, inquiryId: docRef.id };
  } catch (error) {
    console.error("Error creating inquiry:", error);
    throw new Error("Failed to create inquiry");
  }
}

export async function updateInquiryAction(id: string, data: AdminInquiryData) {
  try {
    const docRef = doc(db, "inquiries", id);
    
    await updateDoc(docRef, {
      name: data.name,
      email: data.email,
      affiliation: data.affiliation,
      designation: data.designation,
      status: data.status,
      isApproved: data.status === 'Approved Client',
    });
    
    // Revalidate the admin inquiry page
    revalidatePath('/admin/inquiry');
    
    return { success: true };
  } catch (error) {
    console.error("Error updating inquiry:", error);
    throw new Error('Failed to update inquiry');
  }
}

export async function deleteInquiryAction(id: string) {
  try {
    const docRef = doc(db, "inquiries", id);
    await deleteDoc(docRef);
    
    // Revalidate the admin inquiry page
    revalidatePath('/admin/inquiry');
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting inquiry:", error);
    throw new Error('Failed to delete inquiry');
  }
}