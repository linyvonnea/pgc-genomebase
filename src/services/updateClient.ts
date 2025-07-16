// Service for updating a client document in Firestore.
// Accepts partial client data and merges it into the existing client document.

import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { Client } from "@/types/Client";

/**
 * Update a client document in Firestore by client ID.
 * Merges the provided data into the existing document.
 * @param cid The client ID (document key)
 * @param data Partial client data to update
 */
export async function updateClient(cid: string, data: Partial<Client>) {
  const clientRef = doc(db, "clients", cid);
  await setDoc(clientRef, data, { merge: true });
}
