/**
 * Admin Internal Chat Types
 *
 * Supports direct-message (DM) channels between admin users.
 * Stored in Firestore collections:
 *   adminChannels/{channelId}  — channel metadata
 *   adminMessages/{messageId} — individual messages
 *
 * Security note: Firestore rules should restrict read/write on both
 * collections so that only authenticated users whose email is listed
 * in `participants[]` can access a channel and its messages.
 */

import { Timestamp } from "firebase/firestore";

/**
 * A direct-message channel between two admin users.
 * channelId is derived deterministically from sorted participant emails
 * so the same pair always maps to the same document.
 */
export interface AdminChannel {
  id: string;
  /** Sorted list of participant email addresses */
  participants: string[];
  /** Display name map: sanitisedEmailKey → name */
  participantNames: Record<string, string>;
  /** Last activity */
  lastMessageAt?: Timestamp;
  lastMessageBy?: string;
  lastMessagePreview?: string;
  /**
   * Unread count per participant.
   * Keys are sanitised email addresses (see emailToKey() in adminChatService).
   */
  unreadCounts: Record<string, number>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * A single message inside an AdminChannel.
 */
export interface AdminMessage {
  id?: string;
  channelId: string;
  /** Admin email address */
  senderId: string;
  senderName: string;
  content: string;
  createdAt: Timestamp;
  /**
   * Array of admin emails who have read this message.
   * The sender is added at creation time so they never
   * appear as "unread" in their own view.
   */
  readBy: string[];
}
