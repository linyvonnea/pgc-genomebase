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

    // Convert null values to undefined to match Client type
    const client: Client = {
      ...parsed.data,
      cid: parsed.data.cid ?? undefined,
      name: parsed.data.name ?? undefined,
      email: parsed.data.email ?? undefined,
      affiliation: parsed.data.affiliation ?? undefined,
      designation: parsed.data.designation ?? undefined,
      sex: parsed.data.sex ?? undefined,
      phoneNumber: parsed.data.phoneNumber ?? undefined,
      affiliationAddress: parsed.data.affiliationAddress ?? undefined,
      pid: parsed.data.pid ?? undefined,
      createdAt: parsed.data.createdAt ?? undefined,
      haveSubmitted: typeof parsed.data.haveSubmitted === 'boolean' 
        ? parsed.data.haveSubmitted 
        : parsed.data.haveSubmitted === 'true' ? true 
        : parsed.data.haveSubmitted === 'false' ? false 
        : undefined,
      isContactPerson: typeof parsed.data.isContactPerson === 'boolean' 
        ? parsed.data.isContactPerson 
        : parsed.data.isContactPerson === 'true' ? true 
        : parsed.data.isContactPerson === 'false' ? false 
        : undefined,
      year: typeof parsed.data.year === 'number' ? parsed.data.year : undefined,
    };

    return client;
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
    const project: Project = {
      ...parsed.data,
      createdAt: parsed.data.createdAt instanceof Date 
        ? parsed.data.createdAt 
        : parsed.data.createdAt 
        ? new Date(parsed.data.createdAt) 
        : undefined,
      fundingCategory: parsed.data.fundingCategory === "External" || parsed.data.fundingCategory === "In-House" 
        ? parsed.data.fundingCategory 
        : undefined,
      status: parsed.data.status === "Ongoing" || parsed.data.status === "Cancelled" || parsed.data.status === "Completed"
        ? parsed.data.status
        : undefined,
      sendingInstitution: ["UP System", "SUC/HEI", "Government", "Private/Local", "International", "N/A"].includes(parsed.data.sendingInstitution!)
        ? parsed.data.sendingInstitution as "UP System" | "SUC/HEI" | "Government" | "Private/Local" | "International" | "N/A"
        : undefined,
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