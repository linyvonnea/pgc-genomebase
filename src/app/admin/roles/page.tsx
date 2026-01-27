"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Shield, Save, RotateCcw, Info } from "lucide-react";
import { toast } from "sonner";
import { getRolePermissions, updateRolePermissions } from "@/services/permissionService";
import {
  UserRole,
  RolePermissions,
  MODULE_LABELS,
  MODULE_SECTIONS,
  DEFAULT_ROLE_PERMISSIONS,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  PermissionAction,
} from "@/types/Permissions";
import { PermissionGuard } from "@/components/PermissionGuard";

export default function RoleManagementPage() {
  return (
    <PermissionGuard module="roleManagement" action="view">
      <RoleManagementContent />
    </PermissionGuard>
  );
}

function RoleManagementContent() {
  const [selectedRole, setSelectedRole] = useState<UserRole>("viewer");
  const [permissions, setPermissions] = useState<RolePermissions>(
    DEFAULT_ROLE_PERMISSIONS[selectedRole]
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load permissions from Firestore when role changes
  useEffect(() => {
    const loadPermissions = async () => {
      setLoading(true);
      try {
        const rolePerms = await getRolePermissions(selectedRole);
        setPermissions(rolePerms);
      } catch (error) {
        console.error("Error loading permissions:", error);
        toast.error("Failed to load permissions");
      } finally {
        setLoading(false);
      }
    };
    loadPermissions();
  }, [selectedRole]);

  const handleRoleChange = (role: UserRole) => {
    if (hasChanges) {
      if (!confirm("You have unsaved changes. Are you sure you want to switch roles?")) {
        return;
      }
    }
    setSelectedRole(role);
    setHasChanges(false);
    // Permissions will be loaded by useEffect
  };

  const handlePermissionToggle = (
    module: keyof RolePermissions,
    action: PermissionAction
  ) => {
    setPermissions((prev) => ({
      ...prev,
      [module]: {
        ...prev[module],
        [action]: !prev[module][action],
      },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateRolePermissions(selectedRole, permissions);
      toast.success(`Permissions updated for ${ROLE_LABELS[selectedRole]}`);
      setHasChanges(false);
    } catch (error) {
      toast.error("Failed to save permissions");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      const rolePerms = await getRolePermissions(selectedRole);
      setPermissions(rolePerms);
      setHasChanges(false);
      toast.info("Reset to saved permissions");
    } catch (error) {
      console.error("Error resetting permissions:", error);
      toast.error("Failed to reset permissions");
    } finally {
      setLoading(false);
    }
  };

  const renderPermissionRow = (module: keyof RolePermissions) => {
    const modulePerms = permissions[module];
    const actions: PermissionAction[] = ["view", "create", "edit", "delete"];

    return (
      <div key={module} className="grid grid-cols-6 gap-4 items-center py-3 border-b hover:bg-gray-50">
        <div className="col-span-2 font-medium text-sm">{MODULE_LABELS[module]}</div>
        {actions.map((action) => (
          <div key={action} className="flex justify-center">
            <Checkbox
              checked={modulePerms[action]}
              onCheckedChange={() => handlePermissionToggle(module, action)}
              disabled={loading}
              className="h-5 w-5"
            />
          </div>
        ))}
      </div>
    );
  };

  const renderSection = (
    title: string,
    modules: readonly (keyof RolePermissions)[]
  ) => (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3 flex items-center gap-2">
        <div className="h-px bg-gray-300 flex-1" />
        <span>{title}</span>
        <div className="h-px bg-gray-300 flex-1" />
      </h3>
      <div className="space-y-0">
        {modules.map((module) => renderPermissionRow(module))}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Shield className="h-8 w-8 text-blue-600" />
          Role & Permission Management
        </h1>
        <p className="text-gray-600 mt-2">
          Configure module access and permissions for each user role
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Role Selection Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Role</CardTitle>
              <CardDescription>Choose a role to configure</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
                <button
                  key={role}
                  onClick={() => handleRoleChange(role)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    selectedRole === role
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="font-semibold text-sm">{ROLE_LABELS[role]}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {ROLE_DESCRIPTIONS[role]}
                  </div>
                </button>
              ))}

              <Separator className="my-4" />

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-900">
                    <strong>Tip:</strong> Changes are saved per role. Make sure to save
                    before switching roles.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Permissions Matrix */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    Permissions for{" "}
                    <Badge variant="default" className="text-base">
                      {ROLE_LABELS[selectedRole]}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {ROLE_DESCRIPTIONS[selectedRole]}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    disabled={!hasChanges || loading}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reset
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={!hasChanges || loading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Table Header */}
              <div className="grid grid-cols-6 gap-4 items-center pb-3 border-b-2 bg-gray-50 -mx-6 px-6 py-3 mb-3">
                <div className="col-span-2 font-bold text-sm uppercase text-gray-700">
                  Module
                </div>
                <div className="font-bold text-sm uppercase text-gray-700 text-center">
                  View
                </div>
                <div className="font-bold text-sm uppercase text-gray-700 text-center">
                  Create
                </div>
                <div className="font-bold text-sm uppercase text-gray-700 text-center">
                  Edit
                </div>
                <div className="font-bold text-sm uppercase text-gray-700 text-center">
                  Delete
                </div>
              </div>

              {/* Operations Section */}
              {renderSection("OPERATIONS", MODULE_SECTIONS.operations)}

              {/* Configuration Section */}
              {renderSection("CONFIGURATION", MODULE_SECTIONS.configuration)}

              {/* Administration Section */}
              {renderSection("ADMINISTRATION", MODULE_SECTIONS.administration)}

              {hasChanges && (
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-900">
                    <Info className="h-5 w-5" />
                    <span className="font-semibold">Unsaved Changes</span>
                  </div>
                  <p className="text-sm text-amber-800 mt-1">
                    You have made changes to the permissions. Click "Save Changes" to
                    apply them.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
