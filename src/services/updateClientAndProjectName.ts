// Update client document and synchronize client name in all related projects.
// Handles legacy logic for updating/removing client names in project documents when client info changes.

import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc, updateDoc, collection, getDocs, query, where } from "firebase/firestore";
import { Client } from "@/types/Client";

export async function updateClientAndProjectName(cid: string, data: Partial<Client>, oldName?: string, oldPid?: string) {
  // Update client document in Firestore
  const clientRef = doc(db, "clients", cid);
  await setDoc(clientRef, data, { merge: true });

  // Update all projects where clientNames contains oldName (rename in all projects)
  if (oldName && oldName.trim() && data.name && data.name.trim()) {
    const projectsRef = collection(db, "projects");
    const q = query(projectsRef, where("clientNames", "array-contains", oldName));
    const snapshot = await getDocs(q);
    for (const projectDoc of snapshot.docs) {
      let clientNames: string[] = Array.isArray(projectDoc.data().clientNames) ? projectDoc.data().clientNames : [];
      // Replace oldName with new name
      clientNames = clientNames.map(n => n === oldName ? data.name! : n);
      await updateDoc(projectDoc.ref, { clientNames });
    }
  }

  // Remove client name from old project if pid changed (legacy logic)
  if (oldPid && oldPid !== data.pid && oldName && oldName.trim()) {
    const oldProjectRef = doc(db, "projects", oldPid);
    const oldProjectSnap = await getDoc(oldProjectRef);
    if (oldProjectSnap.exists()) {
      let clientNames: string[] = Array.isArray(oldProjectSnap.data().clientNames) ? oldProjectSnap.data().clientNames : [];
      // Remove oldName from clientNames array
      clientNames = clientNames.filter(n => n !== oldName);
      await updateDoc(oldProjectRef, { clientNames });
    }
  }

  // Add or update client name in new project (legacy logic)
  if (data.name && data.pid) {
    const projectRef = doc(db, "projects", data.pid);
    const projectSnap = await getDoc(projectRef);
    if (projectSnap.exists()) {
      let clientNames: string[] = Array.isArray(projectSnap.data().clientNames) ? projectSnap.data().clientNames : [];
      // Remove old name if present
      if (oldName && clientNames.includes(oldName)) {
        clientNames = clientNames.filter(n => n !== oldName);
      }
      // Add new name if not present
      if (data.name.trim() && !clientNames.includes(data.name)) {
        clientNames.push(data.name);
      }
      // Remove any empty strings from the array
      clientNames = clientNames.filter(n => n && n.trim());
      await updateDoc(projectRef, { clientNames });
    }
  }
}
