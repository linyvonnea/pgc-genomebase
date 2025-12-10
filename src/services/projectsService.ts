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
    const projectsQuery = query(projectsRef, orderBy("pid", "desc"));
    const querySnapshot = await getDocs(projectsQuery);

    const projects: Project[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
}

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
          retail: "Retail Services",
          equip: "Equipment Use",
          equipment: "Equipment Use",
          "Bioinformatics Analysis": "Bioinformatics Analysis",
          "Laboratory Services": "Laboratory Services",
          "Retail Services": "Retail Services",
          "Equipment Use": "Equipment Use",
        };
        data.serviceRequested = data.serviceRequested
          .map((code: string) => serviceMap[code] || code)
          // Only keep valid, unique service names
          .filter(
            (val: string, idx: number, arr: string[]) =>
              [
                "Laboratory Services",
                "Retail Services",
                "Equipment Use",
                "Bioinformatics Analysis",
                "N/A"
              ].includes(val) && arr.indexOf(val) === idx
          );
      }

      const candidate = {
        id: doc.id,
        ...data,
      };

      // Validate with Zod schema
      //const result = projectSchema.safeParse(candidate);
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

        const project: Project = {
          ...raw,
          //createdAt:
          //  raw.createdAt instanceof Date
          //    ? raw.createdAt
          //    : raw.createdAt
          //    ? new Date(raw.createdAt)
          //    : undefined,
          //fundingCategory:
          //  raw.fundingCategory === "External" || raw.fundingCategory === "In-House"
          //    ? raw.fundingCategory
          //    : undefined,
          //startDate: raw.startDate
          //  ? formatDateToMMDDYYYY(new Date(raw.startDate))
          //  : undefined,
          //clientNames: raw.clientNames
          //  ? raw.clientNames.map((s) => s.trim())
          //  : undefined,
          //status:
          //  raw.status === "Ongoing" ||
          //  raw.status === "Cancelled" ||
          //  raw.status === "Completed"
          //    ? raw.status
          //    : undefined,
          //sendingInstitution:
          //  allowedInstitutions.includes(raw.sendingInstitution as typeof allowedInstitutions[number])
          //    ? (raw.sendingInstitution as typeof allowedInstitutions[number])
          //    : undefined,
        };
        projects.push(project);
      } else {
        // Debug: log validation errors and the candidate data
        console.error('Project validation failed:', candidate, result.error);
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
