import { AdminRole } from "@/services/adminService";

/**
 * Comprehensive permission system for admin roles
 * Defines what operations each role can perform
 */

export type Permission = 
  // Admin Management
  | "manage_admins"
  | "view_admins"
  | "edit_admin"
  | "delete_admin"
  
  // User/Client Management
  | "manage_clients"
  | "view_clients"
  | "edit_client"
  | "delete_client"
  
  // Project Management
  | "manage_projects"
  | "view_projects"
  | "edit_project"
  | "delete_project"
  
  // Quotation Management
  | "create_quotation"
  | "view_quotation"
  | "edit_quotation"
  | "delete_quotation"
  | "download_quotation"
  
  // Charge Slip Management
  | "create_charge_slip"
  | "view_charge_slip"
  | "edit_charge_slip"
  | "delete_charge_slip"
  
  // Inquiry Management
  | "view_inquiry"
  | "edit_inquiry"
  | "delete_inquiry"
  
  // Service Catalog
  | "manage_services"
  | "view_services"
  | "edit_service"
  | "delete_service"
  
  // Dashboard & Reports
  | "view_dashboard"
  | "export_reports"
  
  // Activity Logs
  | "view_activity_logs";

/**
 * Permission matrix defining what each role can do
 */
const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  "superadmin": [
    // Full access to everything
    "manage_admins", "view_admins", "edit_admin", "delete_admin",
    "manage_clients", "view_clients", "edit_client", "delete_client",
    "manage_projects", "view_projects", "edit_project", "delete_project",
    "create_quotation", "view_quotation", "edit_quotation", "delete_quotation", "download_quotation",
    "create_charge_slip", "view_charge_slip", "edit_charge_slip", "delete_charge_slip",
    "view_inquiry", "edit_inquiry", "delete_inquiry",
    "manage_services", "view_services", "edit_service", "delete_service",
    "view_dashboard", "export_reports",
    "view_activity_logs",
  ],
  
  "admin": [
    // Cannot manage other admins, but can do most operations
    "view_admins",
    "manage_clients", "view_clients", "edit_client", "delete_client",
    "manage_projects", "view_projects", "edit_project", "delete_project",
    "create_quotation", "view_quotation", "edit_quotation", "delete_quotation", "download_quotation",
    "create_charge_slip", "view_charge_slip", "edit_charge_slip", "delete_charge_slip",
    "view_inquiry", "edit_inquiry", "delete_inquiry",
    "view_services", "edit_service",
    "view_dashboard", "export_reports",
    "view_activity_logs",
  ],
  
  "moderator": [
    // Can view and edit, but limited delete permissions
    "view_admins",
    "view_clients", "edit_client",
    "view_projects", "edit_project",
    "create_quotation", "view_quotation", "edit_quotation", "download_quotation",
    "create_charge_slip", "view_charge_slip", "edit_charge_slip",
    "view_inquiry", "edit_inquiry",
    "view_services",
    "view_dashboard",
    "view_activity_logs",
  ],
  
  "viewer": [
    // Read-only access
    "view_admins",
    "view_clients",
    "view_projects",
    "view_quotation", "download_quotation",
    "view_charge_slip",
    "view_inquiry",
    "view_services",
    "view_dashboard",
    "view_activity_logs",
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: AdminRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: AdminRole | undefined, permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: AdminRole | undefined, permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.every(permission => hasPermission(role, permission));
}

/**
 * Get all permissions for a role
 */
export function getPermissions(role: AdminRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if user can perform admin management operations
 */
export function canManageAdmins(role: AdminRole | undefined): boolean {
  return hasPermission(role, "manage_admins");
}

/**
 * Check if user can delete resources
 */
export function canDelete(role: AdminRole | undefined, resource: "admin" | "client" | "project" | "quotation" | "charge_slip" | "inquiry" | "service"): boolean {
  const permissionMap = {
    admin: "delete_admin",
    client: "delete_client",
    project: "delete_project",
    quotation: "delete_quotation",
    charge_slip: "delete_charge_slip",
    inquiry: "delete_inquiry",
    service: "delete_service",
  } as const;
  
  return hasPermission(role, permissionMap[resource] as Permission);
}

/**
 * Check if user can edit resources
 */
export function canEdit(role: AdminRole | undefined, resource: "admin" | "client" | "project" | "quotation" | "charge_slip" | "inquiry" | "service"): boolean {
  const permissionMap = {
    admin: "edit_admin",
    client: "edit_client",
    project: "edit_project",
    quotation: "edit_quotation",
    charge_slip: "edit_charge_slip",
    inquiry: "edit_inquiry",
    service: "edit_service",
  } as const;
  
  return hasPermission(role, permissionMap[resource] as Permission);
}

/**
 * Check if user can create resources
 */
export function canCreate(role: AdminRole | undefined, resource: "quotation" | "charge_slip"): boolean {
  const permissionMap = {
    quotation: "create_quotation",
    charge_slip: "create_charge_slip",
  } as const;
  
  return hasPermission(role, permissionMap[resource] as Permission);
}
