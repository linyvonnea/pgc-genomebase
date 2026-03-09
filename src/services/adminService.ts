import { collection, getDocs, doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserRole, ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/types/Permissions";

// Use UserRole from Permissions for consistency
export type AdminRole = UserRole;

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
  { value: "superadmin", label: ROLE_LABELS.superadmin, description: ROLE_DESCRIPTIONS.superadmin },
  { value: "admin", label: ROLE_LABELS.admin, description: ROLE_DESCRIPTIONS.admin },
  { value: "moderator", label: ROLE_LABELS.moderator, description: ROLE_DESCRIPTIONS.moderator },
  { value: "viewer", label: ROLE_LABELS.viewer, description: ROLE_DESCRIPTIONS.viewer },
];

/**
 * Normalize role strings from Firestore to match UserRole type
 * Handles common variations and converts to permission system format
 */
function normalizeRole(role: string | undefined): AdminRole {
  if (!role) return "viewer";
  
  const normalized = role.toLowerCase().trim();
  
  // Handle variations and convert to UserRole format
  if (normalized === "superadmin" || normalized === "super-admin" || normalized === "super admin") {
    return "superadmin";
  }
  if (normalized === "admin") {
    return "admin";
  }
  if (normalized === "moderator" || normalized === "mod") {
    return "moderator";
  }
  
  return "viewer";
}

export async function getAllAdmins(): Promise<Admin[]> {
  const adminsRef = collection(db, "admins");
  const snapshot = await getDocs(adminsRef);
  
  const admins = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      uid: doc.id,
      email: doc.id,
      name: data.name || "",
      position: data.position || "",
      role: normalizeRole(data.role),
      photoURL: data.photoURL || undefined,
      createdAt: data.createdAt,
      lastLogin: data.lastLogin,
    } as Admin;
  });
  
  return admins;
}

export async function getAdminByEmail(email: string): Promise<Admin | null> {
  const adminRef = doc(db, "admins", email);
  const snapshot = await getDoc(adminRef);
  
  if (!snapshot.exists()) return null;
  
  const data = snapshot.data();
  
  return {
    uid: snapshot.id,
    email: snapshot.id,
    name: data.name || "",
    position: data.position || "",
    role: normalizeRole(data.role),
    photoURL: data.photoURL,
    createdAt: data.createdAt,
    lastLogin: data.lastLogin,
  };
}

export async function saveAdmin(admin: Admin): Promise<void> {
  const adminRef = doc(db, "admins", admin.email);
  await setDoc(adminRef, {
    name: admin.name,
    position: admin.position,
    role: admin.role,
    photoURL: admin.photoURL || null,
    createdAt: admin.createdAt || new Date(),
    lastLogin: admin.lastLogin || null,
  }, { merge: true });
}

export async function deleteAdmin(email: string): Promise<void> {
  const adminRef = doc(db, "admins", email);
  await deleteDoc(adminRef);
}

export async function updateAdminPosition(email: string, position: string): Promise<void> {
  const adminRef = doc(db, "admins", email);
  await setDoc(adminRef, {
    position,
  }, { merge: true });
}
