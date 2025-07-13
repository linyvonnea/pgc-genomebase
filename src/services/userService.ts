import { db } from "@/lib/firebase"; 
import { doc, getDoc } from "firebase/firestore";

// Utility function to get user role from Firestore
export async function getUserRole(email: string): Promise<"admin" | "client"> {
  if (!email) throw new Error("Email is required to get user role.");

  const userDocRef = doc(db, "users", email);
  const userSnap = await getDoc(userDocRef);

  if (userSnap.exists()) {
    const data = userSnap.data();
    if (data.role === "admin" || data.role === "client") {
      return data.role;
    }
  }

  // Default fallback if user document doesn't exist or no valid role
  return "client";
}