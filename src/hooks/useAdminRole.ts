"use client";

import { useState, useEffect } from "react";
import { AdminRole } from "@/services/adminService";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

/**
 * Normalize role strings to match AdminRole type
 */
function normalizeRole(role: string | undefined): AdminRole | undefined {
  if (!role) return undefined;
  
  const normalized = role.toLowerCase().trim();
  
  if (normalized === "superadmin" || normalized === "super-admin" || normalized === "super admin") {
    return "superadmin";
  }
  if (normalized === "admin") {
    return "admin";
  }
  if (normalized === "moderator" || normalized === "mod") {
    return "moderator";
  }
  if (normalized === "viewer") {
    return "viewer";
  }
  
  return undefined;
}

/**
 * Hook to get the current user's admin role
 * Returns the role and loading state
 */
export function useAdminRole() {
  const [role, setRole] = useState<AdminRole | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user?.email) {
        try {
          const adminDoc = await getDoc(doc(db, "admins", user.email));
          if (adminDoc.exists()) {
            const adminData = adminDoc.data();
            const normalizedRole = normalizeRole(adminData.role);
            if (normalizedRole) {
              setRole(normalizedRole);
            }
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { role, loading };
}
