import { collection, getDocs, query, orderBy, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Inquiry } from "@/types/Inquiry";

export async function getInquiries(): Promise<Inquiry[]> {
  try {
    console.log("Attempting to connect to Firestore...");
    
    // Query the inquiries collection, ordered by creation date (newest first)
    const inquiriesRef = collection(db, "inquiries");
    const q = query(inquiriesRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    const inquiries: Inquiry[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
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
    };
  } catch (error) {
    console.error(`Failed to fetch inquiry ${id}:`, error);
    throw error;
  }
}