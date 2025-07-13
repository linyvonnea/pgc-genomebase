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
 * Fetch a single client by ID (cid)
 */
export async function getClientById(cid: string): Promise<Client | null> {
  try {
    const docRef = doc(db, "clients", cid);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) return null;

    const data = snapshot.data();

    // Convert timestamps
    if (data.createdAt?.toDate) data.createdAt = data.createdAt.toDate();

    const parsed = clientSchema.safeParse({ id: snapshot.id, ...data });

    if (!parsed.success) {
      console.warn("❌ Failed to validate client:", parsed.error);
      return null;
    }

    return parsed.data;
  } catch (error) {
    console.error("❌ Error fetching client:", error);
    return null;
  }
}

/**
 * Fetch a single project by ID (pid)
 */
export async function getProjectById(pid: string): Promise<Project | null> {
  try {
    const docRef = doc(db, "projects", pid);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) return null;

    const data = snapshot.data();

    // Convert timestamps
    if (data.createdAt?.toDate) data.createdAt = data.createdAt.toDate();
    if (data.startDate?.toDate) data.startDate = data.startDate.toDate();

    const parsed = projectSchema.safeParse({ id: snapshot.id, ...data });

    if (!parsed.success) {
      console.warn("❌ Failed to validate project:", parsed.error);
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
  } catch (error) {
    console.error("❌ Error fetching project:", error);
    return null;
  }
}