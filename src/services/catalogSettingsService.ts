/**
 * Catalog Settings Service
 * Manages CRUD operations for dropdown options and reference data
 */

import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { CatalogSettings, CatalogItem, CatalogType } from "@/types/CatalogSettings";

const CATALOG_DOC_ID = "project-catalogs";

/**
 * Get all catalog settings
 */
export async function getCatalogSettings(): Promise<CatalogSettings> {
  try {
    const docRef = doc(db, "settings", CATALOG_DOC_ID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        sendingInstitutions: data.sendingInstitutions || getDefaultSendingInstitutions(),
        fundingCategories: data.fundingCategories || getDefaultFundingCategories(),
        fundingInstitutions: data.fundingInstitutions || [],
        serviceRequested: data.serviceRequested || getDefaultServiceRequested(),
        personnelAssigned: data.personnelAssigned || [],
      };
    } else {
      // Initialize with defaults if document doesn't exist
      const defaults = getDefaultCatalogSettings();
      await setDoc(docRef, {
        ...defaults,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return defaults;
    }
  } catch (error) {
    console.error("Error fetching catalog settings:", error);
    return getDefaultCatalogSettings();
  }
}

/**
 * Get a specific catalog type
 */
export async function getCatalog(type: CatalogType): Promise<CatalogItem[]> {
  const settings = await getCatalogSettings();
  return settings[type];
}

/**
 * Add a new item to a catalog
 */
export async function addCatalogItem(
  type: CatalogType,
  value: string
): Promise<void> {
  try {
    const docRef = doc(db, "settings", CATALOG_DOC_ID);
    const settings = await getCatalogSettings();
    
    const maxOrder = settings[type].reduce((max, item) => Math.max(max, item.order), 0);
    
    const newItem: CatalogItem = {
      id: `${type}-${Date.now()}`,
      value,
      order: maxOrder + 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedItems = [...settings[type], newItem];

    await updateDoc(docRef, {
      [type]: updatedItems,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error adding item to ${type}:`, error);
    throw error;
  }
}

/**
 * Update an existing catalog item
 */
export async function updateCatalogItem(
  type: CatalogType,
  itemId: string,
  updates: Partial<CatalogItem>
): Promise<void> {
  try {
    const docRef = doc(db, "settings", CATALOG_DOC_ID);
    const settings = await getCatalogSettings();

    const updatedItems = settings[type].map((item) =>
      item.id === itemId
        ? { ...item, ...updates, updatedAt: new Date() }
        : item
    );

    await updateDoc(docRef, {
      [type]: updatedItems,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error updating item in ${type}:`, error);
    throw error;
  }
}

/**
 * Delete a catalog item (soft delete by setting isActive to false)
 */
export async function deleteCatalogItem(
  type: CatalogType,
  itemId: string
): Promise<void> {
  try {
    await updateCatalogItem(type, itemId, { isActive: false });
  } catch (error) {
    console.error(`Error deleting item from ${type}:`, error);
    throw error;
  }
}

/**
 * Reorder catalog items
 */
export async function reorderCatalogItems(
  type: CatalogType,
  itemIds: string[]
): Promise<void> {
  try {
    const docRef = doc(db, "settings", CATALOG_DOC_ID);
    const settings = await getCatalogSettings();

    const updatedItems = settings[type].map((item) => {
      const newOrder = itemIds.indexOf(item.id);
      return newOrder >= 0 ? { ...item, order: newOrder } : item;
    });

    updatedItems.sort((a, b) => a.order - b.order);

    await updateDoc(docRef, {
      [type]: updatedItems,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error reordering items in ${type}:`, error);
    throw error;
  }
}

/**
 * Get active items only (for use in forms)
 */
export async function getActiveCatalogItems(type: CatalogType): Promise<string[]> {
  try {
    const items = await getCatalog(type);
    return items
      .filter((item) => item.isActive)
      .sort((a, b) => a.order - b.order)
      .map((item) => item.value);
  } catch (error) {
    console.error(`Error fetching active catalog items for ${type}:`, error);
    return []; // Return empty array as fallback
  }
}

// Default values
function getDefaultSendingInstitutions(): CatalogItem[] {
  return [
    { id: "si-1", value: "UP System", order: 1, isActive: true },
    { id: "si-2", value: "SUC/HEI", order: 2, isActive: true },
    { id: "si-3", value: "Government", order: 3, isActive: true },
    { id: "si-4", value: "Private/Local", order: 4, isActive: true },
    { id: "si-5", value: "International", order: 5, isActive: true },
    { id: "si-6", value: "N/A", order: 6, isActive: true },
  ];
}

function getDefaultFundingCategories(): CatalogItem[] {
  return [
    { id: "fc-1", value: "External", order: 1, isActive: true },
    { id: "fc-2", value: "In-House", order: 2, isActive: true },
  ];
}

function getDefaultServiceRequested(): CatalogItem[] {
  return [
    { id: "sr-1", value: "Laboratory Services", order: 1, isActive: true },
    { id: "sr-2", value: "Retail Services", order: 2, isActive: true },
    { id: "sr-3", value: "Equipment Use", order: 3, isActive: true },
    { id: "sr-4", value: "Bioinformatics Analysis", order: 4, isActive: true },
    { id: "sr-5", value: "Training", order: 5, isActive: true },
  ];
}

function getDefaultCatalogSettings(): CatalogSettings {
  return {
    sendingInstitutions: getDefaultSendingInstitutions(),
    fundingCategories: getDefaultFundingCategories(),
    fundingInstitutions: [],
    serviceRequested: getDefaultServiceRequested(),
    personnelAssigned: [],
  };
}
