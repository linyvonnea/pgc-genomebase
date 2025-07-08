import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Inquiry } from "@/types/Inquiry";
import { inquirySchema } from "@/schemas/inquirySchema";

export async function getInquiries(): Promise<Inquiry[]> {
  try {
    // Query the inquiries collection, ordered by creation date (newest first)
    const inquiriesRef = collection(db, "inquiries");
    const q = query(inquiriesRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    const inquiries: Inquiry[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Convert Firestore Timestamp to Date if needed
      if (data.createdAt && typeof data.createdAt.toDate === 'function') {
        data.createdAt = data.createdAt.toDate();
      }
      
      // Validate the data using Zod schema
      const result = inquirySchema.safeParse({
        id: doc.id, // Use document ID as the inquiry ID
        ...data
      });
      
      if (result.success) {
        inquiries.push(result.data);
      } else {
        console.error(`Invalid inquiry data for document ${doc.id}:`, result.error);
      }
    });
    
    return inquiries;
  } catch (error) {
    console.error("Error fetching inquiries:", error);
    throw new Error("Failed to fetch inquiries from database");
  }
}