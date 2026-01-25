import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
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
    
    return service;
  });
  
  return services;
}

export async function saveService(service: ServiceItem): Promise<void> {
  const serviceRef = doc(db, "services", service.id);
  await setDoc(serviceRef, {
    id: service.id,
    name: service.name,
    category: service.category,
    type: service.type,
    unit: service.unit,
    price: service.price,
    description: service.description || "",
    minQuantity: service.minQuantity || null,
    additionalUnitPrice: service.additionalUnitPrice || null,
    minParticipants: service.minParticipants || null,
    additionalParticipantPrice: service.additionalParticipantPrice || null,
  });
}

export async function deleteService(serviceId: string): Promise<void> {
  const serviceRef = doc(db, "services", serviceId);
  await deleteDoc(serviceRef);
}