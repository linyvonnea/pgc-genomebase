import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { Client } from "@/types/Client";

export async function updateClient(cid: string, data: Partial<Client>) {
  const clientRef = doc(db, "clients", cid);
  await setDoc(clientRef, data, { merge: true });
}
