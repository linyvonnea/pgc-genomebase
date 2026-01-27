"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import type { RolePermissions } from "@/types/Permissions";

interface PermissionGuardProps {
  children: React.ReactNode;
  module: keyof RolePermissions;
  action?: "view" | "create" | "edit" | "delete";
  fallbackPath?: string;
}

export function PermissionGuard({ 
  children, 
  module, 
  action = "view",
  fallbackPath = "/admin/dashboard" 
}: PermissionGuardProps) {
  const router = useRouter();
  const { adminInfo } = useAuth();
  const { checkPermission, loading } = usePermissions(adminInfo?.role);

  useEffect(() => {
    if (!loading && !checkPermission(module, action)) {
      router.push(fallbackPath);
    }
  }, [loading, module, action, checkPermission, router, fallbackPath]);

  // Show loading or nothing while checking permissions
  if (loading || !checkPermission(module, action)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#166FB5] mx-auto mb-4"></div>
          <p className="text-sm text-slate-500">Checking permissions...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
