import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { Client } from "@/types/Client";

export async function updateClientAndProjectName(cid: string, data: Partial<Client>, oldName?: string, oldPid?: string) {
  // Update client document
  const clientRef = doc(db, "clients", cid);
  await setDoc(clientRef, data, { merge: true });

  // Remove client name from old project if pid changed
  if (oldPid && oldPid !== data.pid && oldName && oldName.trim()) {
    const oldProjectRef = doc(db, "projects", oldPid);
    const oldProjectSnap = await getDoc(oldProjectRef);
    if (oldProjectSnap.exists()) {
      let clientNames: string[] = Array.isArray(oldProjectSnap.data().clientNames) ? oldProjectSnap.data().clientNames : [];
      clientNames = clientNames.filter(n => n !== oldName);
      await updateDoc(oldProjectRef, { clientNames });
    }
  }

  // Add or update client name in new project
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
      // Remove any empty strings
      clientNames = clientNames.filter(n => n && n.trim());
      await updateDoc(projectRef, { clientNames });
    }
  }
}
