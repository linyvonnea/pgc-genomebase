/**
 * Quotation Thread Service
 * 
 * Manages the entire lifecycle of quotations from inquiry to approval,
 * including communication between admin and client.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  addDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  QuotationThread,
  QuotationVersion,
  ThreadMessage,
  InquiryStatus,
  QuotationStatus,
  MessageSenderRole,
  MessageType,
  QuotationGenerationRequest,
  QuotationItem,
} from "@/types/QuotationThread";

const THREADS_COLLECTION = "quotationThreads";
const MESSAGES_COLLECTION = "threadMessages";
const QUOTATIONS_COLLECTION = "quotations";

/**
 * Initialize a quotation thread when an inquiry is submitted
 */
export async function initializeQuotationThread(inquiryId: string): Promise<string> {
  try {
    // Get inquiry data
    const inquiryRef = doc(db, "inquiries", inquiryId);
    const inquirySnap = await getDoc(inquiryRef);
    
    if (!inquirySnap.exists()) {
      throw new Error("Inquiry not found");
    }
    
    const inquiryData = inquirySnap.data();
    
    // Check if thread already exists
    const threadRef = doc(db, THREADS_COLLECTION, inquiryId);
    const threadSnap = await getDoc(threadRef);
    
    if (threadSnap.exists()) {
      return inquiryId; // Thread already exists
    }
    
    // Create new thread
    const thread: Omit<QuotationThread, "id"> = {
      inquiryId,
      clientEmail: inquiryData.email || "",
      clientName: inquiryData.name || "",
      clientAffiliation: inquiryData.affiliation || "",
      status: "pending",
      quotations: [],
      unreadCount: {
        admin: 0,
        client: 0,
      },
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    };
    
    await setDoc(threadRef, thread);
    
    // Create initial system message
    await addThreadMessage({
      threadId: inquiryId,
      type: "system",
      content: "Inquiry submitted. Waiting for admin review.",
      senderId: "system",
      senderName: "System",
      senderRole: "admin",
      isRead: false,
    });
    
    return inquiryId;
  } catch (error) {
    console.error("Error initializing quotation thread:", error);
    throw error;
  }
}

/**
 * Get a quotation thread by ID
 */
export async function getQuotationThread(threadId: string): Promise<QuotationThread | null> {
  try {
    const threadRef = doc(db, THREADS_COLLECTION, threadId);
    const threadSnap = await getDoc(threadRef);
    
    if (!threadSnap.exists()) {
      return null;
    }
    
    return { id: threadSnap.id, ...threadSnap.data() } as QuotationThread;
  } catch (error) {
    console.error("Error getting quotation thread:", error);
    throw error;
  }
}

/**
 * Get all quotation threads (for admin dashboard)
 */
export async function getAllQuotationThreads(
  statusFilter?: InquiryStatus[]
): Promise<QuotationThread[]> {
  try {
    const threadsRef = collection(db, THREADS_COLLECTION);
    let q = query(threadsRef, orderBy("updatedAt", "desc"));
    
    if (statusFilter && statusFilter.length > 0) {
      q = query(threadsRef, where("status", "in", statusFilter), orderBy("updatedAt", "desc"));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuotationThread));
  } catch (error) {
    console.error("Error getting quotation threads:", error);
    throw error;
  }
}

/**
 * Get threads assigned to a specific admin
 */
export async function getAdminAssignedThreads(adminEmail: string): Promise<QuotationThread[]> {
  try {
    const threadsRef = collection(db, THREADS_COLLECTION);
    const q = query(
      threadsRef,
      where("assignedTo", "==", adminEmail),
      orderBy("updatedAt", "desc")
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuotationThread));
  } catch (error) {
    console.error("Error getting admin assigned threads:", error);
    throw error;
  }
}

/**
 * Subscribe to quotation thread updates (real-time)
 */
export function subscribeToQuotationThread(
  threadId: string,
  callback: (thread: QuotationThread | null) => void
): () => void {
  const threadRef = doc(db, THREADS_COLLECTION, threadId);
  
  return onSnapshot(threadRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() } as QuotationThread);
    } else {
      callback(null);
    }
  });
}

/**
 * Update thread status
 */
export async function updateThreadStatus(
  threadId: string,
  status: InquiryStatus,
  adminEmail?: string
): Promise<void> {
  try {
    const threadRef = doc(db, THREADS_COLLECTION, threadId);
    await updateDoc(threadRef, {
      status,
      updatedAt: serverTimestamp(),
    });
    
    // Add system message
    const statusMessages: Record<InquiryStatus, string> = {
      pending: "Inquiry is pending review",
      under_review: "Admin is reviewing your inquiry",
      quoted: "Quotation has been sent",
      negotiating: "Quotation is under discussion",
      approved: "Quotation has been approved",
      rejected: "Inquiry has been closed",
      converted: "Inquiry has been converted to a project",
    };
    
    await addThreadMessage({
      threadId,
      type: "system",
      content: statusMessages[status],
      senderId: adminEmail || "system",
      senderName: "System",
      senderRole: "admin",
      isRead: false,
    });
  } catch (error) {
    console.error("Error updating thread status:", error);
    throw error;
  }
}

/**
 * Assign thread to admin
 */
export async function assignThreadToAdmin(
  threadId: string,
  adminEmail: string,
  adminName: string
): Promise<void> {
  try {
    const threadRef = doc(db, THREADS_COLLECTION, threadId);
    await updateDoc(threadRef, {
      assignedTo: adminEmail,
      assignedToName: adminName,
      updatedAt: serverTimestamp(),
    });
    
    await addThreadMessage({
      threadId,
      type: "system",
      content: `Inquiry assigned to ${adminName}`,
      senderId: adminEmail,
      senderName: "System",
      senderRole: "admin",
      isRead: false,
    });
  } catch (error) {
    console.error("Error assigning thread:", error);
    throw error;
  }
}

/**
 * Generate a quotation number
 */
function generateQuotationNumber(inquiryId: string, version: number): string {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, "0");
  const shortId = inquiryId.substring(0, 8).toUpperCase();
  return `QUO-${year}${month}-${shortId}-V${version}`;
}

/**
 * Calculate quotation totals
 */
function calculateQuotationTotals(
  items: QuotationItem[],
  discount?: number,
  discountPercentage?: number,
  tax?: number,
  taxPercentage?: number
) {
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  
  let discountAmount = discount || 0;
  if (discountPercentage) {
    discountAmount = subtotal * (discountPercentage / 100);
  }
  
  const afterDiscount = subtotal - discountAmount;
  
  let taxAmount = tax || 0;
  if (taxPercentage) {
    taxAmount = afterDiscount * (taxPercentage / 100);
  }
  
  const totalAmount = afterDiscount + taxAmount;
  
  return {
    subtotal,
    discount: discountAmount,
    tax: taxAmount,
    totalAmount,
  };
}

/**
 * Create a new quotation version
 */
export async function createQuotationVersion(
  request: QuotationGenerationRequest,
  adminEmail: string,
  adminName: string
): Promise<QuotationVersion> {
  try {
    const thread = await getQuotationThread(request.inquiryId);
    if (!thread) {
      throw new Error("Quotation thread not found");
    }
    
    const version = (thread.currentQuotationVersion || 0) + 1;
    const quotationNumber = generateQuotationNumber(request.inquiryId, version);
    
    // Add IDs and calculate subtotals for items
    const items: QuotationItem[] = request.items.map((item, index) => ({
      ...item,
      id: `item-${Date.now()}-${index}`,
      subtotal: item.quantity * item.unitPrice,
    }));
    
    // Calculate totals
    const totals = calculateQuotationTotals(
      items,
      request.discount,
      request.discountPercentage,
      request.tax,
      request.taxPercentage
    );
    
    // Calculate validity date
    const validityDays = request.validityDays || 30;
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validityDays);
    
    // Create quotation version
    const quotation: Omit<QuotationVersion, "id"> = {
      version,
      inquiryId: request.inquiryId,
      quotationNumber,
      items,
      subtotal: totals.subtotal,
      discount: totals.discount,
      discountPercentage: request.discountPercentage,
      tax: totals.tax,
      taxPercentage: request.taxPercentage,
      totalAmount: totals.totalAmount,
      status: "draft",
      createdBy: adminEmail,
      createdByName: adminName,
      notes: request.notes,
      termsAndConditions: request.termsAndConditions,
      validUntil: Timestamp.fromDate(validUntil),
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    };
    
    // Save quotation
    const quotationRef = await addDoc(collection(db, QUOTATIONS_COLLECTION), quotation);
    const quotationId = quotationRef.id;
    
    // Update thread
    const threadRef = doc(db, THREADS_COLLECTION, request.inquiryId);
    await updateDoc(threadRef, {
      currentQuotationVersion: version,
      [`quotations`]: [...thread.quotations, { ...quotation, id: quotationId }],
      updatedAt: serverTimestamp(),
    });
    
    return { id: quotationId, ...quotation } as QuotationVersion;
  } catch (error) {
    console.error("Error creating quotation version:", error);
    throw error;
  }
}

/**
 * Send quotation to client
 */
export async function sendQuotationToClient(
  threadId: string,
  quotationId: string,
  adminEmail: string,
  adminName: string,
  message?: string
): Promise<void> {
  try {
    // Update quotation status
    const quotationRef = doc(db, QUOTATIONS_COLLECTION, quotationId);
    await updateDoc(quotationRef, {
      status: "sent",
      sentAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    // Update thread status
    const thread = await getQuotationThread(threadId);
    const newStatus: InquiryStatus = thread?.status === "pending" ? "quoted" : "negotiating";
    await updateThreadStatus(threadId, newStatus);
    
    // Add message
    const content = message || `Quotation ${quotationId} has been sent for your review.`;
    await addThreadMessage({
      threadId,
      type: "quotation",
      content,
      senderId: adminEmail,
      senderName: adminName,
      senderRole: "admin",
      isRead: false,
      quotationVersion: thread?.currentQuotationVersion,
    });
    
    // Increment unread count for client
    const threadRef = doc(db, THREADS_COLLECTION, threadId);
    await updateDoc(threadRef, {
      "unreadCount.client": (thread?.unreadCount.client || 0) + 1,
      lastMessageAt: serverTimestamp(),
      lastMessageBy: adminEmail,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error sending quotation to client:", error);
    throw error;
  }
}

/**
 * Add a message to thread
 */
export async function addThreadMessage(
  message: Omit<ThreadMessage, "id" | "createdAt">
): Promise<string> {
  try {
    const messageData = {
      ...message,
      createdAt: serverTimestamp(),
    };
    
    const messageRef = await addDoc(collection(db, MESSAGES_COLLECTION), messageData);
    
    // Update thread
    const threadRef = doc(db, THREADS_COLLECTION, message.threadId);
    const thread = await getQuotationThread(message.threadId);
    
    if (thread) {
      const unreadCountUpdate = message.senderRole === "admin"
        ? { "unreadCount.client": (thread.unreadCount.client || 0) + 1 }
        : { "unreadCount.admin": (thread.unreadCount.admin || 0) + 1 };
      
      await updateDoc(threadRef, {
        ...unreadCountUpdate,
        lastMessageAt: serverTimestamp(),
        lastMessageBy: message.senderId,
        updatedAt: serverTimestamp(),
      });
    }
    
    return messageRef.id;
  } catch (error) {
    console.error("Error adding thread message:", error);
    throw error;
  }
}

/**
 * Get thread messages
 */
export async function getThreadMessages(threadId: string): Promise<ThreadMessage[]> {
  try {
    const messagesRef = collection(db, MESSAGES_COLLECTION);
    const q = query(
      messagesRef,
      where("threadId", "==", threadId),
      orderBy("createdAt", "asc")
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ThreadMessage));
  } catch (error) {
    console.error("Error getting thread messages:", error);
    throw error;
  }
}

/**
 * Subscribe to thread messages (real-time)
 */
export function subscribeToThreadMessages(
  threadId: string,
  callback: (messages: ThreadMessage[]) => void
): () => void {
  const messagesRef = collection(db, MESSAGES_COLLECTION);
  const q = query(
    messagesRef,
    where("threadId", "==", threadId),
    orderBy("createdAt", "asc")
  );
  
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ThreadMessage));
    callback(messages);
  });
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(
  threadId: string,
  userRole: MessageSenderRole,
  userEmail: string
): Promise<void> {
  try {
    const thread = await getQuotationThread(threadId);
    if (!thread) return;
    
    // Reset unread count
    const threadRef = doc(db, THREADS_COLLECTION, threadId);
    const unreadCountUpdate = userRole === "admin"
      ? { "unreadCount.admin": 0 }
      : { "unreadCount.client": 0 };
    
    await updateDoc(threadRef, unreadCountUpdate);
    
    // Mark individual messages as read
    const messages = await getThreadMessages(threadId);
    const batch = writeBatch(db);
    
    messages.forEach(msg => {
      if (!msg.isRead && msg.senderRole !== userRole && msg.id) {
        const msgRef = doc(db, MESSAGES_COLLECTION, msg.id);
        batch.update(msgRef, {
          isRead: true,
          readAt: serverTimestamp(),
          readBy: userEmail,
        });
      }
    });
    
    await batch.commit();
  } catch (error) {
    console.error("Error marking messages as read:", error);
    throw error;
  }
}

/**
 * Client approves quotation
 */
export async function approveQuotation(
  threadId: string,
  quotationId: string,
  clientEmail: string,
  clientName: string
): Promise<void> {
  try {
    // Update quotation
    const quotationRef = doc(db, QUOTATIONS_COLLECTION, quotationId);
    await updateDoc(quotationRef, {
      status: "approved",
      approvedAt: serverTimestamp(),
      approvedBy: clientEmail,
      updatedAt: serverTimestamp(),
    });
    
    // Update thread
    await updateThreadStatus(threadId, "approved");
    
    // Add message
    await addThreadMessage({
      threadId,
      type: "approval",
      content: "Quotation has been approved by the client.",
      senderId: clientEmail,
      senderName: clientName,
      senderRole: "client",
      isRead: false,
    });
  } catch (error) {
    console.error("Error approving quotation:", error);
    throw error;
  }
}

/**
 * Client requests revision
 */
export async function requestQuotationRevision(
  threadId: string,
  quotationId: string,
  revisionNotes: string,
  clientEmail: string,
  clientName: string
): Promise<void> {
  try {
    // Update quotation
    const quotationRef = doc(db, QUOTATIONS_COLLECTION, quotationId);
    await updateDoc(quotationRef, {
      status: "revised",
      updatedAt: serverTimestamp(),
    });
    
    // Update thread
    await updateThreadStatus(threadId, "negotiating");
    
    // Add message
    await addThreadMessage({
      threadId,
      type: "revision_request",
      content: revisionNotes,
      senderId: clientEmail,
      senderName: clientName,
      senderRole: "client",
      isRead: false,
    });
  } catch (error) {
    console.error("Error requesting quotation revision:", error);
    throw error;
  }
}
