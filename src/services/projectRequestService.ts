// Service for managing project and primary member approval requests.
// Draft projects are stored here until approved, then moved to `projects` and `clients` collections.

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type ProjectRequestStatus = "draft" | "pending" | "approved" | "rejected";

export interface PrimaryMemberData {
  name: string;
  email: string;
  affiliation: string;
  designation: string;
  sex: "M" | "F" | "Other";
  phoneNumber: string;
  affiliationAddress: string;
}

export interface ProjectRequest {
  id?: string;
  inquiryId: string;
  requestedBy: string; // Email of requester
  requestedByName: string; // Name of requester
  
  // Project details
  title: string;
  projectLead: string;
  startDate: Timestamp;
  sendingInstitution: string;
  fundingInstitution: string;
  
  // Primary member (must be provided for submission)
  primaryMember?: PrimaryMemberData;
  
  // Approval tracking
  status: ProjectRequestStatus;
  
  // Assigned IDs (only set upon approval)
  pid?: string;
  cid?: string; // Primary member's CID
  
  // Timestamps
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  submittedAt?: Timestamp;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  rejectionReason?: string;
}

const COLLECTION = "projectRequests";

/**
 * Generate unique document ID for a new project request
 */
function generateDocId(): string {
  return `pr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Save or update a draft project request.
 * If id is provided, updates existing. Otherwise creates new.
 */
export async function saveProjectRequest(
  data: Omit<ProjectRequest, "id" | "createdAt" | "updatedAt">,
  existingId?: string
): Promise<string> {
  const docId = existingId || generateDocId();
  const docRef = doc(db, COLLECTION, docId);
  const existing = existingId ? await getDoc(docRef) : null;

  if (existing?.exists()) {
    // Update existing draft
    await setDoc(
      docRef,
      {
        ...data,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } else {
    // Create new draft
    await setDoc(docRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  return docId;
}

/**
 * Submit a project request for admin approval.
 * Requires primary member data to be included.
 */
export async function submitProjectForApproval(
  projectRequestId: string,
  inquiryId: string,
  requestedBy: string,
  requestedByName: string,
  projectData: {
    title: string;
    projectLead: string;
    startDate: Date;
    sendingInstitution: string;
    fundingInstitution: string;
  },
  primaryMember: PrimaryMemberData
): Promise<string> {
  const docRef = doc(db, COLLECTION, projectRequestId);

  await setDoc(
    docRef,
    {
      inquiryId,
      requestedBy,
      requestedByName,
      title: projectData.title,
      projectLead: projectData.projectLead,
      startDate: Timestamp.fromDate(projectData.startDate),
      sendingInstitution: projectData.sendingInstitution,
      fundingInstitution: projectData.fundingInstitution,
      primaryMember,
      status: "pending" as ProjectRequestStatus,
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return projectRequestId;
}

/**
 * Get a specific project request by its ID.
 */
export async function getProjectRequestById(
  projectRequestId: string
): Promise<ProjectRequest | null> {
  const docRef = doc(db, COLLECTION, projectRequestId);
  const snap = await getDoc(docRef);

  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...snap.data(),
  } as ProjectRequest;
}

/**
 * Get all project requests for an inquiry (supports multiple drafts per inquiry).
 */
export async function getProjectRequestsByInquiry(
  inquiryId: string
): Promise<ProjectRequest[]> {
  const q = query(
    collection(db, COLLECTION),
    where("inquiryId", "==", inquiryId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ProjectRequest[];
}

/**
 * Get a project request by inquiry ID (legacy - returns first match).
 * @deprecated Use getProjectRequestsByInquiry for multiple drafts support
 */
export async function getProjectRequest(
  inquiryId: string
): Promise<ProjectRequest | null> {
  const requests = await getProjectRequestsByInquiry(inquiryId);
  return requests.length > 0 ? requests[0] : null;
}

/**
 * Get project requests by status.
 */
export async function getProjectRequestsByStatus(
  status?: ProjectRequestStatus | "all"
): Promise<ProjectRequest[]> {
  let q;
  if (status && status !== "all") {
    q = query(
      collection(db, COLLECTION),
      where("status", "==", status)
    );
  } else {
    q = query(collection(db, COLLECTION));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ProjectRequest[];
}

/**
 * Get all pending project requests (for admin).
 */
export async function getPendingProjectRequests(): Promise<ProjectRequest[]> {
  return getProjectRequestsByStatus("pending");
}

/**
 * Get all project requests for admin (any status).
 */
export async function getAllProjectRequests(): Promise<ProjectRequest[]> {
  return getProjectRequestsByStatus("all");
}

/**
 * Subscribe to a project request's status updates by ID.
 */
export function subscribeToProjectRequestById(
  projectRequestId: string,
  callback: (request: ProjectRequest | null) => void
): () => void {
  const docRef = doc(db, COLLECTION, projectRequestId);

  return onSnapshot(docRef, (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    callback({
      id: snap.id,
      ...snap.data(),
    } as ProjectRequest);
  });
}

/**
 * Subscribe to all project requests for an inquiry.
 */
export function subscribeToProjectRequestsByInquiry(
  inquiryId: string,
  callback: (requests: ProjectRequest[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    where("inquiryId", "==", inquiryId)
  );

  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ProjectRequest[];
    callback(requests);
  });
}

/**
 * Subscribe to a project request's status updates (legacy).
 * @deprecated Use subscribeToProjectRequestById
 */
export function subscribeToProjectRequest(
  inquiryId: string,
  callback: (request: ProjectRequest | null) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    where("inquiryId", "==", inquiryId)
  );

  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback(null);
      return;
    }
    const firstDoc = snapshot.docs[0];
    callback({
      id: firstDoc.id,
      ...firstDoc.data(),
    } as ProjectRequest);
  });
}

/**
 * Subscribe to pending project requests count (for admin notification badge).
 */
export function subscribeToPendingProjectRequestsCount(
  callback: (count: number) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    where("status", "==", "pending")
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.size);
  });
}

/**
 * Delete a project request by ID (admin or user cancellation).
 */
export async function deleteProjectRequestById(projectRequestId: string): Promise<void> {
  const docRef = doc(db, COLLECTION, projectRequestId);
  await deleteDoc(docRef);
}

/**
 * Delete a project request (legacy - deletes first match by inquiryId).
 * @deprecated Use deleteProjectRequestById
 */
export async function deleteProjectRequest(inquiryId: string): Promise<void> {
  const requests = await getProjectRequestsByInquiry(inquiryId);
  if (requests.length > 0) {
    await deleteProjectRequestById(requests[0].id!);
  }
}

/**
 * Update request status by ID (admin only).
 */
export async function updateProjectRequestStatusById(
  projectRequestId: string,
  status: ProjectRequestStatus,
  reviewedBy: string,
  pid?: string,
  cid?: string,
  rejectionReason?: string
): Promise<void> {
  const docRef = doc(db, COLLECTION, projectRequestId);

  const updateData: any = {
    status,
    reviewedBy,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (pid) updateData.pid = pid;
  if (cid) updateData.cid = cid;
  if (rejectionReason) updateData.rejectionReason = rejectionReason;

  await setDoc(docRef, updateData, { merge: true });
}

/**
 * Update request status (legacy).
 * @deprecated Use updateProjectRequestStatusById
 */
export async function updateProjectRequestStatus(
  inquiryId: string,
  status: ProjectRequestStatus,
  reviewedBy: string,
  pid?: string,
  cid?: string,
  rejectionReason?: string
): Promise<void> {
  const requests = await getProjectRequestsByInquiry(inquiryId);
  if (requests.length > 0) {
    await updateProjectRequestStatusById(requests[0].id!, status, reviewedBy, pid, cid, rejectionReason);
  }
}
