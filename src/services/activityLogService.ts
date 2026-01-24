// Activity Log Service
// Centralized logging for all CRUD operations across the application

import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, where, orderBy, limit, Timestamp } from "firebase/firestore";

export type ActionType = "CREATE" | "UPDATE" | "DELETE" | "VIEW" | "DOWNLOAD" | "GENERATE" | "LOGIN" | "LOGOUT";
export type EntityType = "client" | "project" | "inquiry" | "quotation" | "charge_slip" | "user";

export interface ActivityLog {
  id?: string;
  timestamp: Date | Timestamp;
  
  // User information
  userId: string;
  userEmail: string;
  userName?: string;
  userRole?: string;
  
  // Action details
  action: ActionType;
  entityType: EntityType;
  entityId: string;
  entityName?: string; // e.g., client name, project name
  
  // Change details (for UPDATE actions)
  changesBefore?: Record<string, any>;
  changesAfter?: Record<string, any>;
  changedFields?: string[];
  
  // Additional context
  description?: string;
  ipAddress?: string;
  userAgent?: string;
}

const LOGS_COLLECTION = "activityLogs";

/**
 * Log an activity/action in the system
 */
export async function logActivity(log: Omit<ActivityLog, "id" | "timestamp">): Promise<void> {
  try {
    const logData = {
      ...log,
      timestamp: Timestamp.fromDate(new Date()),
    };
    
    // Add to Firestore (async, don't wait)
    await addDoc(collection(db, LOGS_COLLECTION), logData);
  } catch (error) {
    // Don't throw errors from logging - just log to console
    console.error("Failed to log activity:", error);
  }
}

/**
 * Get activity logs with filters
 */
export async function getActivityLogs(options?: {
  userId?: string;
  entityType?: EntityType;
  entityId?: string;
  action?: ActionType;
  limitCount?: number;
  startDate?: Date;
  endDate?: Date;
}): Promise<ActivityLog[]> {
  try {
    let q = query(collection(db, LOGS_COLLECTION));
    
    // Apply filters
    // Note: We don't use orderBy() in the Firestore query to avoid composite index requirements
    // Instead, we'll sort in memory after fetching all documents
    
    if (options?.userId) {
      q = query(q, where("userId", "==", options.userId));
    }
    if (options?.entityType) {
      q = query(q, where("entityType", "==", options.entityType));
    }
    if (options?.entityId) {
      q = query(q, where("entityId", "==", options.entityId));
    }
    if (options?.action) {
      q = query(q, where("action", "==", options.action));
    }
    if (options?.startDate) {
      q = query(q, where("timestamp", ">=", Timestamp.fromDate(options.startDate)));
    }
    if (options?.endDate) {
      q = query(q, where("timestamp", "<=", Timestamp.fromDate(options.endDate)));
    }
    
    const snapshot = await getDocs(q);
    
    // Convert to ActivityLog objects
    let logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || new Date(),
    } as ActivityLog));
    
    // Always sort in memory by timestamp descending
    logs.sort((a, b) => {
      const aTime = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
      const bTime = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
      return bTime.getTime() - aTime.getTime();
    });
    
    // Apply limit after sorting
    if (options?.limitCount) {
      logs = logs.slice(0, options.limitCount);
    }
    
    return logs;
  } catch (error) {
    console.error("Failed to fetch activity logs:", error);
    return [];
  }
}

/**
 * Helper function to calculate changed fields between old and new data
 */
export function getChangedFields(oldData: Record<string, any>, newData: Record<string, any>): string[] {
  const changed: string[] = [];
  
  // Check all fields in new data
  for (const key in newData) {
    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
      changed.push(key);
    }
  }
  
  return changed;
}

/**
 * Helper to get user info from auth context
 */
export function getUserInfo(adminInfo: any) {
  return {
    userId: adminInfo?.uid || "unknown",
    userEmail: adminInfo?.email || "unknown",
    userName: adminInfo?.name || undefined,
    userRole: adminInfo?.position || undefined,
  };
}
