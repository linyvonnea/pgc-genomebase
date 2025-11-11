// Service for fetching a single client or project by ID from Firestore, with schema validation and timestamp conversion.

import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { clientSchema } from "@/schemas/clientSchema";
import { projectSchema } from "@/schemas/projectSchema";
import { Client } from "@/types/Client";
import { Project } from "@/types/Project";

/**
 * Utility to safely convert Firestore Timestamp to ISO string
 */
function safeDate(input: any): string | undefined {
  return input?.toDate?.() instanceof Date
    ? input.toDate().toISOString()
    : typeof input === "string"
    ? input
    : undefined;
}

/**
 * Fetch a single client by ID (cid) from Firestore.
 * Converts Firestore timestamps and validates with Zod schema.
 * Returns null if not found or validation fails.
 */
export async function getClientById(cid: string): Promise<Client | null> {
  try {
    const docRef = doc(db, "clients", cid);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) return null;

    const data = snapshot.data();

    // Convert Firestore Timestamp to JS Date
    if (data.createdAt?.toDate) data.createdAt = data.createdAt.toDate();

    // Validate with Zod schema
    const parsed = clientSchema.safeParse({ id: snapshot.id, ...data });

    if (!parsed.success) {
      console.warn(" Failed to validate client:", parsed.error);
      return null;
    }

    return parsed.data as Client;
  } catch (error) {
    console.error("Error fetching client:", error);
    return null;
  }
}

/**
 * Fetch a single project by ID (pid) from Firestore.
 * Converts Firestore timestamps and validates with Zod schema.
 * Returns null if not found or validation fails.
 */
export async function getProjectById(pid: string): Promise<Project | null> {
  try {
    const docRef = doc(db, "projects", pid);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) return null;

    const data = snapshot.data();

    // Convert Firestore Timestamps to JS Dates
    if (data.createdAt?.toDate) data.createdAt = data.createdAt.toDate();
    if (data.startDate?.toDate) data.startDate = data.startDate.toDate();

    // Validate with Zod schema
    const parsed = projectSchema.safeParse({ id: snapshot.id, ...data });

    if (!parsed.success) {
      console.warn(" Failed to validate project:", parsed.error);
      return null;
    }

    // Normalize and format project fields
    const { createdAt, fundingCategory, status, sendingInstitution, ...restData } = parsed.data;
    const project: Project = {
      ...restData,
      fundingCategory: (fundingCategory as Project["fundingCategory"]) || undefined,
      status: (status as Project["status"]) || undefined,
      sendingInstitution: (sendingInstitution as Project["sendingInstitution"]) || undefined,
      createdAt: createdAt instanceof Date ? createdAt : createdAt ? new Date(createdAt) : undefined,
      clientNames: parsed.data.clientNames?.map((s) => s.trim()) || [],
      startDate: parsed.data.startDate
        ? new Date(parsed.data.startDate).toISOString().split("T")[0]
        : undefined,
    };

    return project;
  } catch (error) {
    console.error(" Error fetching project:", error);
    return null;
  }
}