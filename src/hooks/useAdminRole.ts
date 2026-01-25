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
          const userDoc = await getDoc(doc(db, "users", user.email));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const validRoles: AdminRole[] = ["super-admin", "admin", "moderator", "viewer"];
            if (validRoles.includes(userData.role as AdminRole)) {
              setRole(userData.role as AdminRole);
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
