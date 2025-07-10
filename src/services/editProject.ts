import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { AdminProjectData } from "@/schemas/adminProjectSchema";

/**
 * Updates a project document in Firestore.
 * @param data The project data to update. Must include a valid pid.
 * @returns Promise<void>
 */
export async function editProject(data: AdminProjectData): Promise<void> {
  if (!data.pid) {
    throw new Error("Project ID (pid) is required to update a project.");
  }
  const docRef = doc(db, "projects", data.pid);
  await setDoc(docRef, data, { merge: true });
}
