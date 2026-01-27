import { UserRole } from "./Permissions";

export type AdminInfo = {
  name: string;
  position: string;
  role?: UserRole; // User's assigned role for RBAC
  email?: string;
};