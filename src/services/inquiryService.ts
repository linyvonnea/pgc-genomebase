import { collection, getDocs, addDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
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
        year: data.year || new Date().getFullYear(),
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

export async function createInquiry(formData: InquiryFormData): Promise<string> {
  try {
    const inquiriesRef = collection(db, "inquiries");
    
    // Prepare the data for Firebase
    const inquiryData = {
      name: formData.name,
      affiliation: formData.affiliation,
      designation: formData.designation,
      workflows: formData.workflows || [],
      additionalInfo: formData.additionalInfo || '',
      projectBackground: formData.projectBackground || '',
      projectBudget: formData.projectBudget || '',
      status: 'Pending' as const,
      isApproved: false,
      year: new Date().getFullYear(),
      createdAt: serverTimestamp(), // This will be set by Firebase server
      email: null, // Will be set when authentication is implemented
    };
    
    console.log("Creating inquiry with data:", inquiryData);
    
    const docRef = await addDoc(inquiriesRef, inquiryData);
    console.log("Inquiry created with ID:", docRef.id);
    
    return docRef.id;
  } catch (error) {
    console.error("Error creating inquiry:", error);
    throw new Error("Failed to create inquiry");
  }
}