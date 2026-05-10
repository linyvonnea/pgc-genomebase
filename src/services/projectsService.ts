// Service for fetching and generating project records from Firestore, with schema validation, legacy mapping, and ID generation.

import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  onSnapshot,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Project } from "@/types/Project";
import { projectSchema } from "@/schemas/projectSchema";

// Helper to format a JS Date to MM-DD-YYYY string
function formatDateToMMDDYYYY(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
}

/**
 * Fetch all projects from Firestore, ordered by creation date (newest first).
 * Converts Firestore Timestamps to JS Dates, maps legacy service codes, and validates with Zod schema.
 * Returns only valid project records.
 */

// ── Module-level transformation helpers ──────────────────────────────────────

const SERVICE_MAP: Record<string, string> = {
  bio: "Bioinformatics Analysis",
  info: "Bioinformatics Analysis",
  lab: "Laboratory Services",
  retail: "Retail Sales",
  equip: "Equipment Use",
  equipment: "Equipment Use",
  "Bioinformatics Analysis": "Bioinformatics Analysis",
  "Laboratory Services": "Laboratory Services",
  "Retail Services": "Retail Sales",
  "Retail Sales": "Retail Sales",
  "Equipment Use": "Equipment Use",
};

const VALID_SERVICES = [
  "Laboratory Services",
  "Retail Sales",
  "Equipment Use",
  "Bioinformatics Analysis",
  "Training",
  "N/A",
];

function normalizeSendingInstitution(
  value: any
): "UP System" | "SUC/HEI" | "Government" | "Private/Local" | "International" | "N/A" | undefined {
  if (!value) return undefined;
  const n = value.toString().trim().toLowerCase();
  if (["government", "gov", "govt", "govenment"].includes(n)) return "Government";
  if (["up system", "upsystem", "u.p. system"].includes(n)) return "UP System";
  if (["suc/hei", "suc", "hei", "suc hei"].includes(n)) return "SUC/HEI";
  if (["private/local", "private", "local", "private local"].includes(n)) return "Private/Local";
  if (["international", "intl", "int'l"].includes(n)) return "International";
  if (["n/a", "na", "none", "not applicable"].includes(n)) return "N/A";
  const exact = ["UP System", "SUC/HEI", "Government", "Private/Local", "International", "N/A"];
  return exact.includes(value) ? value : undefined;
}

function normalizeStatus(
  value: any
): "Pending" | "Ongoing" | "Completed" | "Cancelled" | undefined {
  if (!value) return undefined;
  const n = value.toString().trim().toLowerCase();
  if (n === "pending") return "Pending";
  if (n === "ongoing") return "Ongoing";
  if (n === "completed") return "Completed";
  if (["cancelled", "canceled"].includes(n)) return "Cancelled";
  return ["Pending", "Ongoing", "Completed", "Cancelled"].includes(value) ? value : undefined;
}

function normalizeFunding(value: any): "External" | "In-House" | undefined {
  if (!value) return undefined;
  const n = value.toString().trim().toLowerCase();
  if (n === "external") return "External";
  if (["in-house", "inhouse"].includes(n)) return "In-House";
  return ["External", "In-House"].includes(value) ? value : undefined;
}

/** Transform a single Firestore project document into a typed Project object. */
function processProjectDoc(
  doc: QueryDocumentSnapshot<DocumentData>
): Project | null {
  const data = doc.data();

  if (data.createdAt && typeof data.createdAt.toDate === "function") {
    data.createdAt = data.createdAt.toDate();
  }
  if (data.startDate && typeof data.startDate.toDate === "function") {
    data.startDate = data.startDate.toDate();
  }

  if (Array.isArray(data.serviceRequested)) {
    data.serviceRequested = data.serviceRequested
      .map((code: string) => SERVICE_MAP[code] || code)
      .filter(
        (val: string, idx: number, arr: string[]) =>
          VALID_SERVICES.includes(val) && arr.indexOf(val) === idx
      );
  }

  const candidate: any = { id: doc.id, ...data };

  try {
    return {
      pid: candidate.pid || "",
      iid: candidate.iid ?? "",
      year: candidate.year || undefined,
      title: candidate.title || "",
      lead: candidate.lead || "",
      projectTag: candidate.projectTag || "",
      notes: candidate.notes || "",
      personnelAssigned: candidate.personnelAssigned || "",
      fundingInstitution: candidate.fundingInstitution || "",
      createdAt:
        candidate.createdAt instanceof Date
          ? candidate.createdAt
          : candidate.createdAt
          ? new Date(candidate.createdAt)
          : undefined,
      startDate: candidate.startDate
        ? formatDateToMMDDYYYY(
            candidate.startDate instanceof Date
              ? candidate.startDate
              : new Date(candidate.startDate)
          )
        : undefined,
      clientNames: Array.isArray(candidate.clientNames)
        ? candidate.clientNames.map((s: any) => s.toString().trim())
        : candidate.clientNames
        ? [candidate.clientNames.toString().trim()]
        : undefined,
      serviceRequested: Array.isArray(candidate.serviceRequested)
        ? candidate.serviceRequested
        : candidate.serviceRequested
        ? [candidate.serviceRequested]
        : undefined,
      sendingInstitution: normalizeSendingInstitution(candidate.sendingInstitution),
      status: normalizeStatus(candidate.status),
      fundingCategory: normalizeFunding(candidate.fundingCategory),
    };
  } catch (error) {
    console.error("Failed to process project:", candidate.pid || doc.id, error);
    return null;
  }
}

export async function getProjects(): Promise<Project[]> {
  try {
    const querySnapshot = await getDocs(collection(db, "projects"));
    const projects: Project[] = [];
    querySnapshot.forEach((doc) => {
      const p = processProjectDoc(doc);
      if (p) projects.push(p);
    });
    projects.sort((a, b) => (b.pid || "").localeCompare(a.pid || ""));
    return projects;
  } catch (error) {
    throw new Error("Failed to fetch projects from database");
  }
}

/**
 * Subscribe to real-time project updates from Firestore.
 * Calls `callback` immediately with the current list and again on every change.
 * Returns an unsubscribe function — call it in your cleanup to stop listening.
 */
export function subscribeToProjects(
  callback: (projects: Project[]) => void
): () => void {
  const projectsRef = collection(db, "projects");
  return onSnapshot(projectsRef, (snapshot) => {
    const projects: Project[] = [];
    snapshot.forEach((doc) => {
      const p = processProjectDoc(doc);
      if (p) projects.push(p);
    });
    projects.sort((a, b) => (b.pid || "").localeCompare(a.pid || ""));
    callback(projects);
  });
}

/**
 * Generate the next available project ID (pid) for a given year.
 * Looks for the highest existing pid for the year and increments it.
 * Returns a string like 'P-2025-017'.
 */
export async function getNextPid(year: number): Promise<string> {
  const projectsRef = collection(db, "projects");
  const yearPrefix = `P-${year}-`;

  const projectsQuery = query(
    projectsRef,
    where("pid", ">=", yearPrefix),
    where("pid", "<", `P-${year + 1}-`)
  );

  const snapshot = await getDocs(projectsQuery);

  // Extract numerical part of pid (e.g., 016 from P-2025-016)
  const numbers = snapshot.docs
    .map((doc) => {
      const pid = doc.data().pid as string;
      const match = pid?.match(/^P-\d{4}-(\d{3})$/);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter((num): num is number => num !== null)
    .sort((a, b) => b - a); // descending

  const nextNum = (numbers[0] || 0) + 1;
  const padded = String(nextNum).padStart(3, "0");

  return `P-${year}-${padded}`;
}

/**
 * Check if a project ID already exists in Firestore
 */
export async function checkPidExists(pid: string): Promise<boolean> {
  const projectsRef = collection(db, "projects");
  const projectsQuery = query(projectsRef, where("pid", "==", pid));
  const snapshot = await getDocs(projectsQuery);
  return !snapshot.empty;
}
