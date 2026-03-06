"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mail } from "lucide-react";
import { subscribeToThreadMessages, markMessagesAsRead, subscribeToQuotationThread } from "@/services/quotationThreadService";
import { MessageSenderRole, QuotationThread } from "@/types/QuotationThread";
import useAuth from "@/hooks/useAuth";

import { useRouter } from "next/navigation";

interface UnreadBadgeProps {
  inquiryId: string;
  role: MessageSenderRole;
}

export default function UnreadBadge({ inquiryId, role }: UnreadBadgeProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMessages, setHasMessages] = useState(false);
  const [hasClientMessages, setHasClientMessages] = useState(false);
  const [threadData, setThreadData] = useState<QuotationThread | null>(null);
  // Guard ref to prevent subscription from reverting the optimistic UI update
  const isMarkingAsReadRef = useRef(false);

  useEffect(() => {
    if (!inquiryId) return;

    // 1. Subscribe to the thread to get last message metadata (senderId, senderName)
    const unsubscribeThread = subscribeToQuotationThread(inquiryId, (thread) => {
      setThreadData(thread);
    });

    // 2. Listen to messages for this thread
    const unsubscribeMessages = subscribeToThreadMessages(inquiryId, (messages) => {
      setHasMessages(messages.length > 0);

      // Check if there are any messages from client
      const clientMessages = messages.filter((m) => m.senderRole === "client");
      setHasClientMessages(clientMessages.length > 0);

      // Count messages that are NOT read and are NOT from us
      const unread = messages.filter(
        (m) => !m.isRead && m.senderRole !== role,
      ).length;

      // Only update if we're NOT in the middle of marking as read
      // This prevents the subscription from reverting the optimistic red→orange transition
      if (!isMarkingAsReadRef.current) {
        setUnreadCount(unread);
      }
    });

    return () => {
      unsubscribeThread();
      unsubscribeMessages();
    };
  }, [inquiryId, role]);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // If there are unread messages, mark them as read
    if (unreadCount > 0 && user?.email) {
      // Set guard to prevent subscription from reverting optimistic state
      isMarkingAsReadRef.current = true;
      
      // Optimistically update UI immediately (turn red to orange)
      setUnreadCount(0);
      
      // Then update Firebase in background
      try {
        await markMessagesAsRead(inquiryId, role, user.email);
      } catch (error) {
        console.error("Error marking messages as read:", error);
      } finally {
        // Release guard after Firestore has been updated
        setTimeout(() => { isMarkingAsReadRef.current = false; }, 500);
      }
    }
    
    // Navigate to the inquiry details after marking as read
    router.push(`/admin/inquiry?inquiryId=${inquiryId}&focus=messages`);
  };

  // Determine envelope state and color
  // 1. No messages at all: hide icon
  if (!hasMessages) return null;

  // 2. Only admin messages (no client messages): Grey envelope
  const isAdminOnly = !hasClientMessages;
  
  // 3. New unread messages from client: Red + bounce + ping
  const hasUnread = unreadCount > 0;
  
  // 4. Client messages but all read: Orange envelope
  const isRead = hasClientMessages && !hasUnread;

  // Determine color and animation
  let envelopeColor = "text-slate-400 opacity-60"; // Default grey
  let shouldAnimate = false;
  let tooltipText = "Messages";

  if (hasUnread) {
    // Red with bounce animation for new messages
    envelopeColor = "text-[#B9273A] drop-shadow-sm animate-bounce";
    shouldAnimate = true;
    tooltipText = `${unreadCount} new message(s)`;
  } else if (isRead) {
    // Orange for read messages from client (Triggered when isRead=true)
    envelopeColor = "text-[#F69122] opacity-100";
    // Include sender reference in tooltip if available
    const senderRef = threadData?.lastMessageBy ? ` - ${threadData.lastMessageBy}` : "";
    tooltipText = `View messages${senderRef}`;
  } else if (isAdminOnly) {
    // Grey for admin-only messages
    envelopeColor = "text-slate-400 opacity-60";
    tooltipText = "Admin messages only";
  }

  return (
    <div
      className="relative ml-1 flex h-6 w-6 cursor-pointer items-center justify-center transition-transform hover:scale-110 active:scale-95"
      onClick={handleClick}
      title={tooltipText}
    >
      <Mail className={`h-4 w-4 transition-all ${envelopeColor}`} />
      {shouldAnimate && (
        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#B9273A]"></span>
        </span>
      )}
    </div>
  );
}
