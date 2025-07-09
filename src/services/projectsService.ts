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

// Helper to format date to MM-DD-YYYY
function formatDateToMMDDYYYY(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
}

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

      const candidate = {
        id: doc.id,
        ...data,
      };

      const result = projectSchema.safeParse(candidate);

      if (result.success) {
        const raw = result.data;

        const project: Project = {
          ...raw,
          startDate: raw.startDate
            ? formatDateToMMDDYYYY(new Date(raw.startDate))
            : undefined,
          clientNames: raw.clientNames
            ? raw.clientNames.map((s) => s.trim())
            : undefined,
        };

        projects.push(project);
      }
    });

    return projects;
  } catch (error) {
    throw new Error("Failed to fetch projects from database");
  }
}

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
