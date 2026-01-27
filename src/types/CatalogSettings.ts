/**
 * Catalog Settings Types
 * Defines the structure for managing dropdown options and reference data
 */

export interface CatalogItem {
  id: string;
  value: string;
  position?: string; // For personnel assigned
  order: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CatalogSettings {
  sendingInstitutions: CatalogItem[];
  fundingCategories: CatalogItem[];
  fundingInstitutions: CatalogItem[];
  serviceRequested: CatalogItem[];
  personnelAssigned: CatalogItem[];
}

export type CatalogType = keyof CatalogSettings;

export const CATALOG_LABELS: Record<CatalogType, string> = {
  sendingInstitutions: "Sending Institutions",
  fundingCategories: "Funding Categories",
  fundingInstitutions: "Funding Institutions",
  serviceRequested: "Service Requested",
  personnelAssigned: "Personnel Assigned",
};
