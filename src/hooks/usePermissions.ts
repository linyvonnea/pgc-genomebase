/**
 * Permission Hook
 * React hook for checking permissions in components
 */

import { useState, useEffect } from "react";
import { UserRole, RolePermissions } from "@/types/Permissions";
import { getRolePermissions, hasPermission } from "@/services/permissionService";

export function usePermissions(userRole: UserRole | undefined) {
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userRole) {
      setLoading(false);
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
