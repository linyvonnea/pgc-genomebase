"use client";

import { useState, useEffect } from "react";
import { AdminRole } from "@/services/adminService";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

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
            const validRoles: AdminRole[] = ["super-admin", "admin", "moderator", "viewer"];
            if (validRoles.includes(adminData.role as AdminRole)) {
              setRole(adminData.role as AdminRole);
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
