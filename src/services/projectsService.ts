import { collection, getDocs, query, orderBy } from "firebase/firestore";
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
    console.log("🔍 Fetching projects from Firestore...");

    // 🆕 Order by createdAt descending (latest first)
    const projectsRef = collection(db, "projects");
    const projectsQuery = query(projectsRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(projectsQuery);

    console.log("📦 Documents fetched:", querySnapshot.size);

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
        console.log("✅ Valid project:", project);
      } else {
        console.warn(`❌ Invalid project in doc ${doc.id}`);
        console.log("📛 Zod errors:", result.error.format());
      }
    });

    console.log("✅ Final valid project count:", projects.length);
    return projects;
  } catch (error) {
    console.error("🔥 Error fetching projects:", error);
    throw new Error("Failed to fetch projects from database");
  }
}
