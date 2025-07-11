// src/services/clientProjectService.ts
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { clientSchema } from "@/schemas/clientSchema";
import { projectSchema } from "@/schemas/projectSchema";
import { Client } from "@/types/Client";
import { Project } from "@/types/Project";

/**
 * Fetch a single client by ID
 */
export async function getClientById(cid: string): Promise<Client | null> {
  const docRef = doc(db, "clients", cid);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) return null;

  const data = snapshot.data();

  // Convert Firestore Timestamp to JS Date if needed
  if (data.createdAt?.toDate) data.createdAt = data.createdAt.toDate();
  if (data.startDate?.toDate) data.startDate = data.startDate.toDate();

  const parsed = clientSchema.safeParse({ id: snapshot.id, ...data });

  if (!parsed.success) {
    console.warn("Failed to validate client:", parsed.error);
    return null;
  }

  return parsed.data;
}

/**
 * Fetch a single project by ID
 */
export async function getProjectById(pid: string): Promise<Project | null> {
  const docRef = doc(db, "projects", pid);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) return null;

  const data = snapshot.data();

  // Convert Firestore Timestamp to JS Date if needed
  if (data.createdAt?.toDate) data.createdAt = data.createdAt.toDate();
  if (data.startDate?.toDate) data.startDate = data.startDate.toDate();

  const parsed = projectSchema.safeParse({ id: snapshot.id, ...data });

  if (!parsed.success) {
    console.warn("Failed to validate project:", parsed.error);
    return null;
  }

  const project: Project = {
    ...parsed.data,
    fundingCategory: parsed.data.fundingCategory || undefined,
    status: parsed.data.status || undefined,
    clientNames: parsed.data.clientNames?.map((s) => s.trim()) || [],
    startDate: parsed.data.startDate
      ? new Date(parsed.data.startDate).toISOString().split("T")[0]
      : undefined,
  };

  return project;
}