/**
 * Permission Service
 * Handles permission checks and role management
 */

import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { UserRole, RolePermissions, DEFAULT_ROLE_PERMISSIONS } from "@/types/Permissions";

const ROLES_COLLECTION = "rolePermissions";

/**
 * Get permissions for a specific role
 */
export async function getRolePermissions(role: UserRole): Promise<RolePermissions> {
  try {
    const docRef = doc(db, ROLES_COLLECTION, role);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as RolePermissions;
    } else {
      // Initialize with default permissions if not exists
      const defaultPerms = DEFAULT_ROLE_PERMISSIONS[role];
      await setDoc(docRef, {
        ...defaultPerms,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return defaultPerms;
    }
  } catch (error) {
    console.error(`Error fetching permissions for ${role}:`, error);
    return DEFAULT_ROLE_PERMISSIONS[role];
  }
}

/**
 * Update permissions for a specific role
 */
export async function updateRolePermissions(
  role: UserRole,
  permissions: RolePermissions
): Promise<void> {
  try {
    const docRef = doc(db, ROLES_COLLECTION, role);
    await updateDoc(docRef, {
      ...permissions,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error updating permissions for ${role}:`, error);
    throw error;
  }
}

/**
 * Check if a user has permission to perform an action on a module
 */
export async function hasPermission(
  userRole: UserRole,
  module: keyof RolePermissions,
  action: keyof RolePermissions[keyof RolePermissions]
): Promise<boolean> {
  try {
    const permissions = await getRolePermissions(userRole);
    return permissions[module][action];
  } catch (error) {
    console.error("Error checking permission:", error);
    return false;
  }
}

/**
 * Check if user can access a module (has at least view permission)
 */
export async function canAccessModule(
  userRole: UserRole,
  module: keyof RolePermissions
): Promise<boolean> {
  return hasPermission(userRole, module, "view");
}
