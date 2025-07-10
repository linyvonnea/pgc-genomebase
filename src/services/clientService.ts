import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Client } from "@/types/Client";
import { clientSchema } from "@/schemas/clientSchema";

// Helper to format date to MM-DD-YYYY
function formatDateToMMDDYYYY(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
}

export async function getClients(): Promise<Client[]> {
  try {
    const clientsRef = collection(db, "clients");
    const clientsQuery = query(clientsRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(clientsQuery);

    const clients: Client[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();

      // Convert Firestore Timestamps to JS Dates
      if (data.createdAt && typeof data.createdAt.toDate === "function") {
        data.createdAt = data.createdAt.toDate();
      }
      if (data.startDate && typeof data.startDate.toDate === "function") {
        data.startDate = data.startDate.toDate();
      }

      const candidate = {
        id: doc.id,
        ...data,
      };

      const result = clientSchema.safeParse(candidate);

      if (result.success) {
        const raw = result.data;

        const client: Client = {
          ...raw,
        };

        clients.push(client);
      }
    });

    return clients;
  } catch (error) {
    throw new Error("Failed to fetch clients from database");
  }
}

export async function getNextCid(year: number): Promise<string> {
  const clientsRef = collection(db, "clients");
  const yearPrefix = `CL-${year}-`;

  const clientsQuery = query(
    clientsRef,
    where("cid", ">=", yearPrefix),
    where("cid", "<", `CL-${year + 1}-`)
  );

  const snapshot = await getDocs(clientsQuery);

  // Extract numerical part of cid (e.g., 016 from P-2025-016)
  const numbers = snapshot.docs
    .map((doc) => {
      const cid = doc.data().cid as string;
      const match = cid?.match(/^CL-\d{4}-(\d{3})$/);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter((num): num is number => num !== null)
    .sort((a, b) => b - a); // descending

  const nextNum = (numbers[0] || 0) + 1;
  const padded = String(nextNum).padStart(3, "0");

  return `CL-${year}-${padded}`;
}
