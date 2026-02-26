/**
 * Inquiry Service
 * 
 * This service handles all database operations related to user inquiries.
 * It provides functions to retrieve inquiry data from Firestore and handles
 * data transformation between Firestore documents and TypeScript objects.
 */

import { collection, getDocs, query, orderBy, doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Inquiry } from "@/types/Inquiry";

/**
 * Retrieves all inquiries from Firestore, ordered by creation date (newest first)
 * 
 * @returns Promise<Inquiry[]> - Array of inquiry objects, empty array if error occurs
 * 
 * Features:
 * - Handles Firestore Timestamp conversion to JavaScript Date objects
 * - Provides fallback values for missing or undefined fields
 * - Sorts results by creation date in descending order
 * - Graceful error handling with console logging
 */
export async function getInquiries(): Promise<Inquiry[]> {
  try {
    console.log("Attempting to connect to Firestore...");
    
    // Create a reference to the 'inquiries' collection and set up query
    // Orders by 'createdAt' field in descending order (newest first)
    const inquiriesRef = collection(db, "inquiries");
    const q = query(inquiriesRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    const inquiries: Inquiry[] = [];
    
    // Process each document in the query results
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Handle Firestore Timestamp conversion to JavaScript Date
      // Firestore stores dates as Timestamp objects with a toDate() method
      let createdAt = data.createdAt;
      if (data.createdAt && typeof data.createdAt.toDate === 'function') {
        // Standard Firestore Timestamp object
        createdAt = data.createdAt.toDate();
      } else if (data.createdAt && typeof data.createdAt === 'string') {
        // Handle string dates (edge case)
        createdAt = new Date(data.createdAt);
      } else {
        // Fallback to current date if no valid date found
        createdAt = new Date();
      }
      
      // Create inquiry object with proper defaults to ensure type safety
      // Uses fallback values for any missing or undefined fields
      const inquiry: Inquiry = {
        id: doc.id,
        createdAt: createdAt,
        name: data.name || 'Unknown',
        status: data.status || 'Pending',
        isApproved: data.isApproved || false,
        affiliation: data.affiliation || '',
        designation: data.designation || '',
        email: data.email || undefined,
        
        // Include new service selection fields
        serviceType: data.serviceType || null,
        species: data.species || null,
        otherSpecies: data.otherSpecies || null,
        researchOverview: data.researchOverview || null,
        methodologyFileUrl: data.methodologyFileUrl || null,
        sampleCount: data.sampleCount || null,
        workflowType: data.workflowType || null,
        individualAssayDetails: data.individualAssayDetails || null,
        
        // Legacy/Service-specific fields
        workflows: data.workflows || [],
        additionalInfo: data.additionalInfo || null,
        projectBackground: data.projectBackground || null,
        projectBudget: data.projectBudget || null,
        specificTrainingNeed: data.specificTrainingNeed || null,
        targetTrainingDate: data.targetTrainingDate || null,
        numberOfParticipants: data.numberOfParticipants || null,
        
        // System fields
        haveSubmitted: data.haveSubmitted || false
      };
      inquiries.push(inquiry);
    });
    
    // Additional sorting in memory as a backup (Firestore query should handle this)
    // Ensures consistent ordering even if Firestore ordering fails
    inquiries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    console.log(`Successfully processed ${inquiries.length} inquiries`);
    return inquiries;
    
  } catch (error) {
    console.error("Error fetching inquiries:", error);
    return [];
  }
}

/**
 * Retrieves a specific inquiry by its document ID
 * 
 * @param id - The Firestore document ID of the inquiry to retrieve
 * @returns Promise<Inquiry> - The inquiry object if found
 * @throws Error if the inquiry is not found or if there's a database error
 * 
 * Note: Unlike getInquiries(), this function throws errors rather than
 * returning empty results, allowing calling code to handle specific error cases
 */
export async function getInquiryById(id: string): Promise<Inquiry> {
  try {
    // Create reference to specific document in 'inquiries' collection
    const docRef = doc(db, "inquiries", id);
    const snap = await getDoc(docRef);

    // Check if document exists in Firestore
    if (!snap.exists()) throw new Error("Inquiry not found");

    const data = snap.data();

    // Transform Firestore document to Inquiry object
    // Uses optional chaining and nullish coalescing for safe property access
    return {
      id: snap.id,
      createdAt: data.createdAt?.toDate?.() ?? new Date(), // Handle Timestamp conversion safely
      name: data.name || "Unknown",
      status: data.status || "Pending",
      isApproved: data.isApproved || false,
      affiliation: data.affiliation || "",
      designation: data.designation || "",
      email: data.email ?? "", 
      
      // Include new service selection fields
      serviceType: data.serviceType || null,
      species: data.species || null,
      otherSpecies: data.otherSpecies || null,
      researchOverview: data.researchOverview || null,
      methodologyFileUrl: data.methodologyFileUrl || null,
      sampleCount: data.sampleCount || null,
      workflowType: data.workflowType || null,
      individualAssayDetails: data.individualAssayDetails || null,
      
      // Legacy/Service-specific fields
      workflows: data.workflows || [],
      additionalInfo: data.additionalInfo || null,
      projectBackground: data.projectBackground || null,
      projectBudget: data.projectBudget || null,
      specificTrainingNeed: data.specificTrainingNeed || null,
      targetTrainingDate: data.targetTrainingDate || null,
      numberOfParticipants: data.numberOfParticipants || null,
      
      // System fields
      haveSubmitted: data.haveSubmitted || false
    };
  } catch (error) {
    console.error(`Failed to fetch inquiry ${id}:`, error);
    throw error;
  }
}

/**
 * Subscribes to changes in a single inquiry document
 * 
 * @param id - The Firestore document ID of the inquiry to monitor
 * @param callback - Function called with the updated Inquiry object
 * @returns Unsubscribe function to stop listening
 */
export function subscribeToInquiryById(
  id: string,
  callback: (inquiry: Inquiry | null) => void
): () => void {
  const docRef = doc(db, "inquiries", id);

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      const data = snapshot.data();
      
      const inquiry: Inquiry = {
        id: snapshot.id,
        createdAt: data.createdAt?.toDate?.() ?? new Date(),
        name: data.name || "Unknown",
        status: data.status || "Pending",
        isApproved: data.isApproved || false,
        affiliation: data.affiliation || "",
        designation: data.designation || "",
        email: data.email ?? "", 
        serviceType: data.serviceType || null,
        species: data.species || null,
        otherSpecies: data.otherSpecies || null,
        researchOverview: data.researchOverview || null,
        methodologyFileUrl: data.methodologyFileUrl || null,
        sampleCount: data.sampleCount || null,
        workflowType: data.workflowType || null,
        individualAssayDetails: data.individualAssayDetails || null,
        workflows: data.workflows || [],
        additionalInfo: data.additionalInfo || null,
        projectBackground: data.projectBackground || null,
        projectBudget: data.projectBudget || null,
        specificTrainingNeed: data.specificTrainingNeed || null,
        targetTrainingDate: data.targetTrainingDate || null,
        numberOfParticipants: data.numberOfParticipants || null,
        haveSubmitted: data.haveSubmitted || false
      };
      
      callback(inquiry);
    },
    (error) => {
      console.error(`Error in inquiry subscription for ${id}:`, error);
      callback(null);
    }
  );
}

/**
 * Subscribe to real-time inquiry updates
 * 
 * @param callback - Function called with updated inquiries array
 * @returns Unsubscribe function to stop listening
 * 
 * This enables real-time updates without page refresh.
 * Call the returned function when component unmounts to clean up.
 */
export function subscribeToInquiries(
  callback: (inquiries: Inquiry[]) => void
): () => void {
  const inquiriesRef = collection(db, "inquiries");
  const q = query(inquiriesRef, orderBy("createdAt", "desc"));

  return onSnapshot(
    q,
    (snapshot) => {
      const inquiries: Inquiry[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        
        // Handle Firestore Timestamp conversion
        let createdAt = data.createdAt;
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          createdAt = data.createdAt.toDate();
        } else if (data.createdAt && typeof data.createdAt === 'string') {
          createdAt = new Date(data.createdAt);
        } else {
          createdAt = new Date();
        }
        
        return {
          id: doc.id,
          createdAt: createdAt,
          name: data.name || 'Unknown',
          status: data.status || 'Pending',
          isApproved: data.isApproved || false,
          affiliation: data.affiliation || '',
          designation: data.designation || '',
          email: data.email || undefined,
          serviceType: data.serviceType || null,
          species: data.species || null,
          otherSpecies: data.otherSpecies || null,
          researchOverview: data.researchOverview || null,
          methodologyFileUrl: data.methodologyFileUrl || null,
          sampleCount: data.sampleCount || null,
          workflowType: data.workflowType || null,
          individualAssayDetails: data.individualAssayDetails || null,
          workflows: data.workflows || [],
          additionalInfo: data.additionalInfo || null,
          projectBackground: data.projectBackground || null,
          projectBudget: data.projectBudget || null,
          specificTrainingNeed: data.specificTrainingNeed || null,
          targetTrainingDate: data.targetTrainingDate || null,
          numberOfParticipants: data.numberOfParticipants || null,
          haveSubmitted: data.haveSubmitted || false
        };
      });
      
      // Sort in memory as backup
      inquiries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      callback(inquiries);
    },
    (error) => {
      console.error("Error in inquiry subscription:", error);
      // On error, call callback with empty array
      callback([]);
    }
  );
}

/**
 * Updates the status of a specific inquiry
 * @param inquiryId - The ID of the inquiry to update
 * @param status - The new status to set
 */
export async function updateInquiryStatus(
  inquiryId: string, 
  status: Inquiry['status']
): Promise<void> {
  try {
    const inquiryRef = doc(db, "inquiries", inquiryId);
    await updateDoc(inquiryRef, { status });
    console.log(`Updated inquiry ${inquiryId} status to: ${status}`);
  } catch (error) {
    console.error(`Error updating inquiry ${inquiryId} status:`, error);
    throw error;
  }
}