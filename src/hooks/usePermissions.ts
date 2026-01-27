/**
 * Permission Hook
 * React hook for checking permissions in components
 * Now with real-time updates when role changes in Firestore
 */

import { useState, useEffect } from "react";
import { UserRole, RolePermissions } from "@/types/Permissions";
import { getRolePermissions, hasPermission } from "@/services/permissionService";
import { doc, onSnapshot } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

export function usePermissions(userRole: UserRole | undefined) {
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Keep loading true if userRole is undefined (auth not ready yet)
    if (userRole === undefined) {
      setLoading(true);
      return;
    }

    const loadPermissions = async () => {
      try {
        const perms = await getRolePermissions(userRole);
        setPermissions(perms);
      } catch (error) {
        console.error("Error loading permissions:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, [userRole]);

  // Real-time listener for role changes
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser?.email) return;

    const adminRef = doc(db, "admins", currentUser.email);
    
    const unsubscribe = onSnapshot(adminRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const newRole = data.role as UserRole | undefined;
        
        // If role changed from what we have, update permissions
        if (newRole && newRole !== userRole) {
          getRolePermissions(newRole).then((perms) => {
            setPermissions(perms);
            
            // Show notification to user
            toast({
              title: "Permissions Updated",
              description: `Your role has been changed to ${newRole}. Your permissions have been updated.`,
              duration: 5000,
            });
          });
        }
      }
    });

    return () => unsubscribe();
  }, [userRole, toast]);

  const checkPermission = (
    module: keyof RolePermissions,
    action: keyof RolePermissions[keyof RolePermissions]
  ): boolean => {
    if (!permissions) return false;
    return permissions[module][action];
  };

  const canView = (module: keyof RolePermissions): boolean => {
    return checkPermission(module, "view");
  };

  const canCreate = (module: keyof RolePermissions): boolean => {
    return checkPermission(module, "create");
  };

  const canEdit = (module: keyof RolePermissions): boolean => {
    return checkPermission(module, "edit");
  };

  const canDelete = (module: keyof RolePermissions): boolean => {
    return checkPermission(module, "delete");
  };

  return {
    permissions,
    loading,
    checkPermission,
    canView,
    canCreate,
    canEdit,
    canDelete,
  };
}
