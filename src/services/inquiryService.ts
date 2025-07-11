import { collection, getDocs, addDoc, serverTimestamp, query, orderBy, doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Inquiry } from "@/types/Inquiry";
import { InquiryFormData } from "@/schemas/inquirySchema";

export async function getInquiries(): Promise<Inquiry[]> {
  try {
    console.log("Attempting to connect to Firestore...");
    
    // Query the inquiries collection, ordered by creation date (newest first)
    const inquiriesRef = collection(db, "inquiries");
    const q = query(inquiriesRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    console.log(`Found ${querySnapshot.size} documents in inquiries collection`);
    
    const inquiries: Inquiry[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`Processing document ${doc.id}:`, data);
      
      // Convert Firestore Timestamp to Date if needed
      let createdAt = data.createdAt;
      if (data.createdAt && typeof data.createdAt.toDate === 'function') {
        createdAt = data.createdAt.toDate();
      } else if (data.createdAt && typeof data.createdAt === 'string') {
        createdAt = new Date(data.createdAt);
      } else {
        createdAt = new Date();
      }
      
      // Create inquiry object with proper defaults
      const inquiry: Inquiry = {
        id: doc.id,
        createdAt: createdAt,
        name: data.name || 'Unknown',
        status: data.status || 'Pending',
        isApproved: data.isApproved || false,
        affiliation: data.affiliation || '',
        designation: data.designation || '',
        email: data.email || undefined
      };
      inquiries.push(inquiry);
    });
    
    // Sort by createdAt in memory
    inquiries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    console.log(`Successfully processed ${inquiries.length} inquiries`);
    return inquiries;
    
  } catch (error) {
    console.error("Error fetching inquiries:", error);
    return [];
  }
}

export const createInquiry = async (inquiryData: any) => {
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
      specificTrainingNeed: inquiryData.specificTrainingNeed || null,
      targetTrainingDate: inquiryData.targetTrainingDate || null,
      numberOfParticipants: inquiryData.numberOfParticipants || null,
      createdAt: serverTimestamp(),
      status: 'Pending',
      isApproved: false,
      serviceType: inquiryData.service || 'added manual record'
      // Removed year here
    };

    const docRef = await addDoc(collection(db, "inquiries"), transformedData);
    return docRef.id;
  } catch (error) {
    console.error("Error creating inquiry:", error);
    throw error;
  }
};

export async function getInquiryById(id: string): Promise<Inquiry> {
  try {
    const docRef = doc(db, "inquiries", id);
    const snap = await getDoc(docRef);

    if (!snap.exists()) throw new Error("Inquiry not found");

    const data = snap.data();

    return {
      id: snap.id,
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
      name: data.name || "Unknown",
      status: data.status || "Pending",
      isApproved: data.isApproved || false,
      affiliation: data.affiliation || "",
      designation: data.designation || "",
      email: data.email ?? "",
      // Removed year here
    };
  } catch (error) {
    console.error(` Failed to fetch inquiry ${id}:`, error);
    throw error;
  }
}

export async function updateInquiry(id: string, data: {
  name: string;
  email: string;
  affiliation: string;
  designation: string;
  status: string;
}) {
  try {
    const docRef = doc(db, "inquiries", id);
    
    // Update the document with the new data
    await updateDoc(docRef, {
      name: data.name,
      email: data.email,
      affiliation: data.affiliation,
      designation: data.designation,
      status: data.status,
      isApproved: data.status === 'Approved Client', // Update isApproved based on status
    });
    
    console.log(`Successfully updated inquiry ${id}`);
    return { success: true };
  } catch (error) {
    console.error("Error updating inquiry:", error);
    throw new Error('Failed to update inquiry');
  }
}

export async function deleteInquiry(id: string) {
  try {
    const docRef = doc(db, "inquiries", id);
    await deleteDoc(docRef);
    console.log(`Successfully deleted inquiry ${id}`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting inquiry:", error);
    throw new Error('Failed to delete inquiry');
  }
}