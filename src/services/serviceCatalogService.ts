import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ServiceItem } from "@/types/ServiceItem";

export async function getServiceCatalog(): Promise<ServiceItem[]> {
  const colRef = collection(db, "services");
  const snapshot = await getDocs(colRef);
  const services = snapshot.docs.map(doc => {
    const data = doc.data() as ServiceItem;
    // Debug: Log services with descriptions
    if (data.description) {
      console.log('Service with description:', data.name, 'Description:', data.description);
    }
    return data;
  });
  return services;
}