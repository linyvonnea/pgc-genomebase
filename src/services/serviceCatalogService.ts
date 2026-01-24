import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ServiceItem } from "@/types/ServiceItem";

export async function getServiceCatalog(): Promise<ServiceItem[]> {
  const colRef = collection(db, "services");
  const snapshot = await getDocs(colRef);
  const services = snapshot.docs.map(doc => {
    const data = doc.data();
    
    // Explicitly map all fields including description
    const service: ServiceItem = {
      id: data.id || doc.id,
      name: data.name || "",
      category: data.category || "",
      type: data.type || "Laboratory",
      unit: data.unit || "",
      price: data.price || 0,
      description: data.description, // Keep undefined if not present, don't default to ""
      minQuantity: data.minQuantity,
      additionalUnitPrice: data.additionalUnitPrice,
      minParticipants: data.minParticipants,
      additionalParticipantPrice: data.additionalParticipantPrice,
    };
    
    // Debug: Log services with descriptions
    if (service.description) {
      console.log('Service with description:', service.name, 'Description:', service.description);
    }
    
    return service;
  });
  
  console.log('Total services loaded:', services.length);
  console.log('Services with descriptions:', services.filter(s => s.description).length);
  
  return services;
}