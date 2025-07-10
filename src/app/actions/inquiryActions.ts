'use server'

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { revalidatePath } from "next/cache";
import { InquiryFormData } from "@/schemas/inquirySchema";

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
      serviceType: inquiryData.service
    };

    const docRef = await addDoc(collection(db, "inquiries"), transformedData);
    
    // Revalidate the admin inquiry page to show new data
    revalidatePath('/admin/inquiry');
    
    return { success: true, inquiryId: docRef.id };
  } catch (error) {
    console.error("Error creating inquiry:", error);
    throw new Error("Failed to create inquiry");
  }
}