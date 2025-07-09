import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ServiceItem } from "@/types/ServiceItem";

export async function getServiceCatalog(): Promise<ServiceItem[]> {
  const colRef = collection(db, "services");
  const snapshot = await getDocs(colRef);
  return snapshot.docs.map(doc => doc.data() as ServiceItem);
}