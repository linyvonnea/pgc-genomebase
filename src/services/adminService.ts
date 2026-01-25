import { collection, getDocs, doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type AdminRole = "super-admin" | "admin" | "moderator" | "viewer";

export interface Admin {
  uid: string;
  email: string;
  name: string;
  position: string;
  role: AdminRole;
  photoURL?: string;
  createdAt?: Date | any;
  lastLogin?: Date | any;
}

export const ADMIN_ROLES: { value: AdminRole; label: string; description: string }[] = [
  { value: "super-admin", label: "Super Admin", description: "Full system access with all privileges" },
  { value: "admin", label: "Admin", description: "Manage users, content, and system settings" },
  { value: "moderator", label: "Moderator", description: "Moderate content and manage basic operations" },
  { value: "viewer", label: "Viewer", description: "Read-only access to admin panel" },
];

export async function getAllAdmins(): Promise<Admin[]> {
  const usersRef = collection(db, "users");
  const snapshot = await getDocs(usersRef);
  
  const validRoles: AdminRole[] = ["super-admin", "admin", "moderator", "viewer"];
  
  const admins = snapshot.docs
    .map(doc => {
      const data = doc.data();
      // Check if role is any admin type
      if (validRoles.includes(data.role as AdminRole)) {
        return {
          uid: doc.id,
          email: doc.id,
          name: data.name || "",
          position: data.position || "",
          role: data.role as AdminRole,
          photoURL: data.photoURL || undefined,
          createdAt: data.createdAt,
          lastLogin: data.lastLogin,
        } as Admin;
      }
      return null;
    })
    .filter((admin): admin is Admin => admin !== null);
  
  return admins;
}

export async function getAdminByEmail(email: string): Promise<Admin | null> {
  const adminRef = doc(db, "users", email);
  const snapshot = await getDoc(adminRef);
  
  if (!snapshot.exists()) return null;
  
  const data = snapshot.data();
  const validRoles: AdminRole[] = ["super-admin", "admin", "moderator", "viewer"];
  if (!validRoles.includes(data.role as AdminRole)) return null;
  
  return {
    uid: snapshot.id,
    email: snapshot.id,
    name: data.name || "",
    position: data.position || "",
    role: "admin",
    photoURL: data.photoURL,
    createdAt: data.createdAt,
    lastLogin: data.lastLogin,
  };
}

export async function saveAdmin(admin: Admin): Promise<void> {
  const adminRef = doc(db, "users", admin.email);
  await setDoc(adminRef, {
    name: admin.name,
    position: admin.position,
    role: "admin",
    photoURL: admin.photoURL || null,
    createdAt: admin.createdAt || new Date(),
    lastLogin: admin.lastLogin || null,
  }, { merge: true });
}

export async function deleteAdmin(email: string): Promise<void> {
  const adminRef = doc(db, "users", email);
  await deleteDoc(adminRef);
}

export async function updateAdminPosition(email: string, position: string): Promise<void> {
  const adminRef = doc(db, "users", email);
  await setDoc(adminRef, {
    position,
  }, { merge: true });
}
