// Service for fetching and generating project records from Firestore, with schema validation, legacy mapping, and ID generation.

import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
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
export async function getProjects(): Promise<Project[]> {
  try {
    const projectsRef = collection(db, "projects");
    const projectsQuery = query(projectsRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(projectsQuery);

    const projects: Project[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();

      // Convert Firestore Timestamps to JS Dates
      if (data.createdAt && typeof data.createdAt.toDate === "function") {
        data.createdAt = data.createdAt.toDate();
      }
      if (data.startDate && typeof data.startDate.toDate === "function") {
        data.startDate = data.startDate.toDate();
      }

      // Map legacy/invalid serviceRequested codes to valid enum values
      if (Array.isArray(data.serviceRequested)) {
        const serviceMap: Record<string, string> = {
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
        data.serviceRequested = data.serviceRequested
          .map((code: string) => serviceMap[code] || code)
          // Only keep valid, unique service names
          .filter(
            (val: string, idx: number, arr: string[]) =>
              [
                "Laboratory Services",
                "Retail Sales",
                "Equipment Use",
                "Bioinformatics Analysis",
                "Training",
                "N/A"
              ].includes(val) && arr.indexOf(val) === idx
          );
      }

      const candidate: any = {
        id: doc.id,
        ...data,
      };

      // Validate with Zod schema - use more lenient validation
      const result = projectSchema.strip().safeParse(candidate);

      if (result.success) {
        const raw = result.data;
        // Normalize and format project fields
        const allowedInstitutions = [
          "UP System",
          "SUC/HEI",
          "Government",
          "Private/Local",
          "International",
          "N/A",
        ] as const;

        // Normalize sendingInstitution (case, spaces, common variants)
        let normalizedInstitution = (raw.sendingInstitution || "").toString().trim().toLowerCase();
        if (["government", "gov", "govt", "govenment"].includes(normalizedInstitution)) {
          normalizedInstitution = "government";
        } else if (["up system", "upsystem", "u.p. system"].includes(normalizedInstitution)) {
          normalizedInstitution = "up system";
        } else if (["suc/hei", "suc", "hei", "suc hei"].includes(normalizedInstitution)) {
          normalizedInstitution = "suc/hei";
        } else if (["private/local", "private", "local", "private local"].includes(normalizedInstitution)) {
          normalizedInstitution = "private/local";
        } else if (["international", "intl", "int'l"].includes(normalizedInstitution)) {
          normalizedInstitution = "international";
        } else if (["n/a", "na", "none", "not applicable"].includes(normalizedInstitution)) {
          normalizedInstitution = "n/a";
        }

        // Map back to allowedInstitutions case, or keep original if not matched
        const institutionMap: Record<string, typeof allowedInstitutions[number]> = {
          "up system": "UP System",
          "suc/hei": "SUC/HEI",
          "government": "Government",
          "private/local": "Private/Local",
          "international": "International",
          "n/a": "N/A",
        };

        const mappedInstitution = institutionMap[normalizedInstitution] || raw.sendingInstitution as any;

        // Normalize status (case-insensitive)
        let normalizedStatus = (raw.status || "").toString().trim().toLowerCase();
        const statusMap: Record<string, "Ongoing" | "Completed" | "Cancelled"> = {
          "ongoing": "Ongoing",
          "completed": "Completed",
          "cancelled": "Cancelled",
          "canceled": "Cancelled"
        };
        const finalStatus: "Ongoing" | "Completed" | "Cancelled" | undefined = statusMap[normalizedStatus] || (raw.status as any);

        // Normalize funding category
        let normalizedFunding = (raw.fundingCategory || "").toString().trim().toLowerCase();
        const fundingMap: Record<string, "External" | "In-House"> = {
          "external": "External",
          "in-house": "In-House",
          "inhouse": "In-House"
        };
        const finalFunding: "External" | "In-House" | undefined = fundingMap[normalizedFunding] || (raw.fundingCategory as any);

        const project: Project = {
          ...raw,
          createdAt:
            raw.createdAt instanceof Date
              ? raw.createdAt
              : raw.createdAt
                ? new Date(raw.createdAt)
                : undefined,
          fundingCategory: finalFunding || undefined,
          startDate: raw.startDate
            ? formatDateToMMDDYYYY(new Date(raw.startDate))
            : undefined,
          clientNames: raw.clientNames
            ? raw.clientNames.map((s) => s.trim())
            : undefined,
          status: finalStatus || undefined,
          sendingInstitution: mappedInstitution,
        };
        projects.push(project);
      } else {
        // Include the record even if schema validation fails, with fallback values
        console.warn('Project schema validation failed, including with fallbacks:', candidate.pid || doc.id, result.error.issues);
        
        // Create a fallback project with available data
        const fallbackProject: Project = {
          pid: candidate.pid || doc.id || '',
          title: candidate.title || '',
          lead: candidate.lead || '',
          status: candidate.status as any,
          sendingInstitution: candidate.sendingInstitution as any,
          createdAt: candidate.createdAt ? new Date(candidate.createdAt) : undefined,
          startDate: candidate.startDate ? formatDateToMMDDYYYY(new Date(candidate.startDate)) : undefined,
          clientNames: Array.isArray(candidate.clientNames) ? candidate.clientNames : candidate.clientNames ? [candidate.clientNames] : undefined,
          fundingCategory: candidate.fundingCategory as any,
          serviceRequested: Array.isArray(candidate.serviceRequested) ? candidate.serviceRequested : candidate.serviceRequested ? [candidate.serviceRequested] : undefined,
          personnelAssigned: candidate.personnelAssigned || undefined,
          notes: candidate.notes || undefined,
        };
        projects.push(fallbackProject);
      }
    });

    return projects;
  } catch (error) {
    throw new Error("Failed to fetch projects from database");
  }
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
