// Service for managing client (team member) approval requests.
// Draft clients are stored here until approved, then moved to `clients` collection.

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
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type ClientRequestStatus = "draft" | "pending" | "approved" | "rejected";

export interface ClientRequestData {
  name: string;
  email: string;
  affiliation: string;
  designation: string;
  sex: "M" | "F" | "Other";
  phoneNumber: string;
  affiliationAddress: string;
}

export interface ClientRequest {
  id?: string;
  inquiryId: string;
  projectRequestId?: string; // Link to specific draft project (optional)
  requestedBy: string; // Email of requester
  requestedByName: string; // Name of requester
  
  // Client/member details
  name: string;
  email: string;
  affiliation: string;
  designation: string;
  sex: "M" | "F" | "Other";
  phoneNumber: string;
  affiliationAddress: string;
  
  // Flags
  isPrimary: boolean; // Is this the primary member?
  isValidated?: boolean; // Has the user saved/validated this information?
  
  // Approval tracking
  status: ClientRequestStatus;
  
  // Assigned CID (only set upon approval)
  cid?: string;
  
  // Timestamps
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  submittedAt?: Timestamp;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  rejectionReason?: string;
}

const COLLECTION = "clientRequests";

/**
 * Generate document ID from inquiryId, email, and optional projectRequestId
 */
function getDocId(inquiryId: string, email: string, projectRequestId?: string): string {
  // Use email as part of ID to ensure unique client requests per inquiry/project
  const sanitizedEmail = email.toLowerCase().replace(/[^a-z0-9]/g, "_");
  if (projectRequestId) {
    return `${inquiryId}_${projectRequestId}_${sanitizedEmail}`;
  }
  return `${inquiryId}_${sanitizedEmail}`;
}

/**
 * Save or update a draft client request.
 */
export async function saveClientRequest(
  data: Omit<ClientRequest, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const docId = getDocId(data.inquiryId, data.email);
  const docRef = doc(db, COLLECTION, docId);
  const existing = await getDoc(docRef);

  if (existing.exists()) {
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
 * Submit client requests for admin approval.
 * Updates all client requests for an inquiry to "pending" status.
 */
export async function submitClientRequestsForApproval(
  inquiryId: string
): Promise<void> {
  const q = query(
    collection(db, COLLECTION),
    where("inquiryId", "==", inquiryId),
    where("status", "==", "draft")
  );
  
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {
      status: "pending",
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
  
  await batch.commit();
}

/**
 * Get a specific client request by inquiry ID and email.
 */
export async function getClientRequest(
  inquiryId: string,
  email: string
): Promise<ClientRequest | null> {
  const docId = getDocId(inquiryId, email);
  const docRef = doc(db, COLLECTION, docId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as ClientRequest;
}

/**
 * Get all client requests for an inquiry.
 */
export async function getClientRequestsByInquiry(
  inquiryId: string,
  status?: ClientRequestStatus
): Promise<ClientRequest[]> {
  const constraints = [where("inquiryId", "==", inquiryId)];
  
  if (status) {
    constraints.push(where("status", "==", status));
  }
  
  const q = query(collection(db, COLLECTION), ...constraints);
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as ClientRequest));
}

/**
 * Subscribe to all client requests for an inquiry (real-time).
 */
export function subscribeToClientRequests(
  inquiryId: string,
  callback: (requests: ClientRequest[]) => void,
  status?: ClientRequestStatus
): () => void {
  let q = query(
    collection(db, COLLECTION),
    where("inquiryId", "==", inquiryId)
  );
  
  if (status) {
    q = query(q, where("status", "==", status));
  }

  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as ClientRequest));
    callback(requests);
  });
}

/**
 * Delete a client request (used when canceling/rejecting).
 */
export async function deleteClientRequest(
  inquiryId: string,
  email: string
): Promise<void> {
  const docId = getDocId(inquiryId, email);
  const docRef = doc(db, COLLECTION, docId);
  await deleteDoc(docRef);
}

/**
 * Get all pending client requests (for admin review).
 */
export async function getAllPendingClientRequests(): Promise<ClientRequest[]> {
  const q = query(
    collection(db, COLLECTION),
    where("status", "==", "pending"),
    orderBy("submittedAt", "desc")
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as ClientRequest));
}

/**
 * Approve a client request and assign CID.
 * This is called by admin during approval process.
 */
export async function approveClientRequest(
  inquiryId: string,
  email: string,
  cid: string,
  reviewedBy: string
): Promise<void> {
  const docId = getDocId(inquiryId, email);
  const docRef = doc(db, COLLECTION, docId);
  
  await setDoc(
    docRef,
    {
      status: "approved",
      cid,
      reviewedBy,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Reject a client request with reason.
 */
export async function rejectClientRequest(
  inquiryId: string,
  email: string,
  reason: string,
  reviewedBy: string
): Promise<void> {
  const docId = getDocId(inquiryId, email);
  const docRef = doc(db, COLLECTION, docId);
  
  await setDoc(
    docRef,
    {
      status: "rejected",
      rejectionReason: reason,
      reviewedBy,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
