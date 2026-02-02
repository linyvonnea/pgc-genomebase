/**
 * Google Drive Backup Service
 * Handles automatic incremental backups to Google Drive
 */

import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, setDoc, query, where, Timestamp } from "firebase/firestore";

export interface BackupMetadata {
  timestamp: string;
  lastBackupDate: Date;
  collections: string[];
  totalDocuments: number;
  isIncremental: boolean;
  changedDocuments: number;
}

/**
 * Get documents that have changed since last backup
 */
export async function getChangedDocuments(collectionName: string, lastBackupDate: Date) {
  try {
    const collectionRef = collection(db, collectionName);
    
    // Query for documents updated after last backup
    // Note: This requires an 'updatedAt' field in your documents
    const q = query(
      collectionRef,
      where('updatedAt', '>', Timestamp.fromDate(lastBackupDate))
    );
    
    const snapshot = await getDocs(q);
    const documents: any[] = [];
    
    snapshot.forEach((doc) => {
      documents.push({
        id: doc.id,
        data: doc.data(),
      });
    });
    
    return documents;
  } catch (error) {
    console.error(`Error getting changed documents from ${collectionName}:`, error);
    // If updatedAt field doesn't exist, fall back to getting all documents
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);
    const documents: any[] = [];
    
    snapshot.forEach((doc) => {
      documents.push({
        id: doc.id,
        data: doc.data(),
      });
    });
    
    return documents;
  }
}

/**
 * Get last backup metadata
 */
export async function getLastBackupMetadata(): Promise<BackupMetadata | null> {
  try {
    const metadataRef = doc(db, 'systemSettings', 'backupMetadata');
    const metadataSnap = await getDoc(metadataRef);
    
    if (metadataSnap.exists()) {
      const data = metadataSnap.data();
      return {
        timestamp: data.timestamp,
        lastBackupDate: data.lastBackupDate.toDate(),
        collections: data.collections,
        totalDocuments: data.totalDocuments,
        isIncremental: data.isIncremental,
        changedDocuments: data.changedDocuments,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting backup metadata:', error);
    return null;
  }
}

/**
 * Save backup metadata
 */
export async function saveBackupMetadata(metadata: BackupMetadata) {
  try {
    const metadataRef = doc(db, 'systemSettings', 'backupMetadata');
    await setDoc(metadataRef, {
      ...metadata,
      lastBackupDate: Timestamp.fromDate(metadata.lastBackupDate),
    });
  } catch (error) {
    console.error('Error saving backup metadata:', error);
    throw error;
  }
}

/**
 * Upload to Google Drive (placeholder - requires OAuth setup)
 */
export async function uploadToGoogleDrive(
  fileName: string,
  fileContent: string,
  folderId?: string
) {
  // This would require Google Drive API setup with OAuth
  // For now, this is a placeholder that would need to be implemented
  // with proper Google OAuth authentication
  
  throw new Error('Google Drive upload requires OAuth setup. Please configure Google Drive API credentials.');
}

/**
 * Check if today is Friday (backup day)
 */
export function isBackupDay(): boolean {
  const today = new Date();
  return today.getDay() === 5; // 5 = Friday
}

/**
 * Perform incremental backup
 */
export async function performIncrementalBackup(
  collections: string[]
): Promise<BackupMetadata> {
  const lastBackup = await getLastBackupMetadata();
  const lastBackupDate = lastBackup?.lastBackupDate || new Date(0); // Epoch if no previous backup
  
  let totalChangedDocuments = 0;
  const backupData: Record<string, any[]> = {};
  
  for (const collectionName of collections) {
    const changedDocs = await getChangedDocuments(collectionName, lastBackupDate);
    backupData[collectionName] = changedDocs;
    totalChangedDocuments += changedDocs.length;
  }
  
  const metadata: BackupMetadata = {
    timestamp: new Date().toISOString(),
    lastBackupDate: new Date(),
    collections,
    totalDocuments: totalChangedDocuments,
    isIncremental: true,
    changedDocuments: totalChangedDocuments,
  };
  
  await saveBackupMetadata(metadata);
  
  return metadata;
}
