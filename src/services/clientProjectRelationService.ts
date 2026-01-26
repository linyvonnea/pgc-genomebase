// Service for managing client-project many-to-many relationships
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  writeBatch,
} from "firebase/firestore";

const CLIENT_PROJECTS_COLLECTION = "client_projects";

export interface ClientProjectRelation {
  clientId: string;
  projectId: string;
  createdAt: Date;
}

/**
 * Add a project to a client
 */
export async function addProjectToClient(clientId: string, projectId: string): Promise<void> {
  try {
    const relationId = `${clientId}_${projectId}`;
    const relationRef = doc(db, CLIENT_PROJECTS_COLLECTION, relationId);
    
    await setDoc(relationRef, {
      clientId,
      projectId,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Error adding project to client:", error);
    throw error;
  }
}

/**
 * Remove a project from a client
 */
export async function removeProjectFromClient(clientId: string, projectId: string): Promise<void> {
  try {
    const relationId = `${clientId}_${projectId}`;
    const relationRef = doc(db, CLIENT_PROJECTS_COLLECTION, relationId);
    await deleteDoc(relationRef);
  } catch (error) {
    console.error("Error removing project from client:", error);
    throw error;
  }
}

/**
 * Get all project IDs for a client
 */
export async function getClientProjects(clientId: string): Promise<string[]> {
  try {
    const q = query(
      collection(db, CLIENT_PROJECTS_COLLECTION),
      where("clientId", "==", clientId)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data().projectId);
  } catch (error) {
    console.error("Error fetching client projects:", error);
    return [];
  }
}

/**
 * Get all client IDs for a project
 */
export async function getProjectClients(projectId: string): Promise<string[]> {
  try {
    const q = query(
      collection(db, CLIENT_PROJECTS_COLLECTION),
      where("projectId", "==", projectId)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data().clientId);
  } catch (error) {
    console.error("Error fetching project clients:", error);
    return [];
  }
}

/**
 * Set all projects for a client (replaces existing relationships)
 */
export async function setClientProjects(clientId: string, projectIds: string[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    
    // Remove all existing relationships
    const existingQuery = query(
      collection(db, CLIENT_PROJECTS_COLLECTION),
      where("clientId", "==", clientId)
    );
    const existingDocs = await getDocs(existingQuery);
    existingDocs.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Add new relationships
    projectIds.forEach(projectId => {
      const relationId = `${clientId}_${projectId}`;
      const relationRef = doc(db, CLIENT_PROJECTS_COLLECTION, relationId);
      batch.set(relationRef, {
        clientId,
        projectId,
        createdAt: new Date(),
      });
    });
    
    await batch.commit();
  } catch (error) {
    console.error("Error setting client projects:", error);
    throw error;
  }
}
