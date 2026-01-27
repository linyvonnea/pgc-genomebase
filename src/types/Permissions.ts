/**
 * Role-Based Access Control (RBAC) Types
 * Defines roles, permissions, and access control structure
 */

export type UserRole = "viewer" | "moderator" | "admin" | "superadmin";

export type PermissionAction = "view" | "create" | "edit" | "delete";

export type ModulePermission = {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
};

export interface RolePermissions {
  // Operations
  dashboard: ModulePermission;
  inquiries: ModulePermission;
  projects: ModulePermission;
  clients: ModulePermission;
  quotations: ModulePermission;
  chargeSlips: ModulePermission;
  manualQuotation: ModulePermission;
  
  // Configuration
  serviceCatalog: ModulePermission;
  catalogSettings: ModulePermission;
  
  // Administration
  usersPermissions: ModulePermission;
  activityLogs: ModulePermission;
}

export const MODULE_LABELS: Record<keyof RolePermissions, string> = {
  dashboard: "Dashboard",
  inquiries: "Inquiries",
  projects: "Projects",
  clients: "Clients",
  quotations: "Quotations",
  chargeSlips: "Charge Slips",
  manualQuotation: "Manual Quotation",
  serviceCatalog: "Service Catalog",
  catalogSettings: "Catalog Settings",
  usersPermissions: "Users & Permissions",
  activityLogs: "Activity Logs",
};

export const MODULE_SECTIONS = {
  operations: [
    "dashboard",
    "inquiries",
    "projects",
    "clients",
    "quotations",
    "chargeSlips",
    "manualQuotation",
  ],
  configuration: ["serviceCatalog", "catalogSettings"],
  administration: ["usersPermissions", "activityLogs"],
} as const;

// Default permissions for each role
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  viewer: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    inquiries: { view: true, create: false, edit: false, delete: false },
    projects: { view: true, create: false, edit: false, delete: false },
    clients: { view: true, create: false, edit: false, delete: false },
    quotations: { view: true, create: false, edit: false, delete: false },
    chargeSlips: { view: true, create: false, edit: false, delete: false },
    manualQuotation: { view: false, create: false, edit: false, delete: false },
    serviceCatalog: { view: true, create: false, edit: false, delete: false },
    catalogSettings: { view: false, create: false, edit: false, delete: false },
    usersPermissions: { view: false, create: false, edit: false, delete: false },
    activityLogs: { view: false, create: false, edit: false, delete: false },
  },
  moderator: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    inquiries: { view: true, create: true, edit: true, delete: false },
    projects: { view: true, create: false, edit: false, delete: false },
    clients: { view: true, create: false, edit: false, delete: false },
    quotations: { view: true, create: true, edit: true, delete: false },
    chargeSlips: { view: true, create: true, edit: true, delete: false },
    manualQuotation: { view: true, create: true, edit: false, delete: false },
    serviceCatalog: { view: true, create: false, edit: false, delete: false },
    catalogSettings: { view: false, create: false, edit: false, delete: false },
    usersPermissions: { view: false, create: false, edit: false, delete: false },
    activityLogs: { view: false, create: false, edit: false, delete: false },
  },
  admin: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    inquiries: { view: true, create: true, edit: true, delete: true },
    projects: { view: true, create: true, edit: true, delete: true },
    clients: { view: true, create: true, edit: true, delete: true },
    quotations: { view: true, create: true, edit: true, delete: true },
    chargeSlips: { view: true, create: true, edit: true, delete: true },
    manualQuotation: { view: true, create: true, edit: true, delete: false },
    serviceCatalog: { view: true, create: true, edit: true, delete: true },
    catalogSettings: { view: true, create: true, edit: true, delete: true },
    usersPermissions: { view: false, create: false, edit: false, delete: false },
    activityLogs: { view: true, create: false, edit: false, delete: false },
  },
  superadmin: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    inquiries: { view: true, create: true, edit: true, delete: true },
    projects: { view: true, create: true, edit: true, delete: true },
    clients: { view: true, create: true, edit: true, delete: true },
    quotations: { view: true, create: true, edit: true, delete: true },
    chargeSlips: { view: true, create: true, edit: true, delete: true },
    manualQuotation: { view: true, create: true, edit: true, delete: true },
    serviceCatalog: { view: true, create: true, edit: true, delete: true },
    catalogSettings: { view: true, create: true, edit: true, delete: true },
    usersPermissions: { view: true, create: true, edit: true, delete: true },
    activityLogs: { view: true, create: false, edit: false, delete: true },
  },
};

export const ROLE_LABELS: Record<UserRole, string> = {
  viewer: "Viewer",
  moderator: "Moderator",
  admin: "Admin",
  superadmin: "Superadmin",
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  viewer: "Read-only access to view data",
  moderator: "Can create and edit operational records",
  admin: "Full control except user management",
  superadmin: "Complete system access and control",
};
