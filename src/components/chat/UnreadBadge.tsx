"use client";

import React, { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import {
  subscribeToThreadMessages,
  markMessagesAsRead,
  subscribeToQuotationThread,
} from "@/services/quotationThreadService";
import { MessageSenderRole, QuotationThread } from "@/types/QuotationThread";
import useAuth from "@/hooks/useAuth";
import { useRouter, useSearchParams } from "next/navigation";

interface UnreadBadgeProps {
  inquiryId: string;
  role: MessageSenderRole;
  senderId?: string;
  senderName?: string;
}

export default function UnreadBadge({
  inquiryId,
  role,
  senderId,
  senderName,
}: UnreadBadgeProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMessages, setHasMessages] = useState(false);
  const [hasClientMessages, setHasClientMessages] = useState(false);
  const [threadData, setThreadData] = useState<QuotationThread | null>(null);
  const [isClearingUnread, setIsClearingUnread] = useState(false);

  const [lastSeenCount, setLastSeenCount] = useState<number | null>(null);

  // Use localStorage to remember if the envelope was clicked/viewed until a new message arrives
  const viewedKey = `viewed_inquiry_${inquiryId}`;
  
  const [isManuallyViewed, setIsManuallyViewed] = useState(false);

  useEffect(() => {
    // Check if we've seen this before on mount
    const stored = localStorage.getItem(viewedKey);
    if (stored === "true") {
      setIsManuallyViewed(true);
    }
  }, [viewedKey]);

  // Detect when the chat widget is open for THIS inquiry
  const isWidgetOpen =
    searchParams.get("inquiryId") === inquiryId &&
    searchParams.get("focus") === "messages";

  // When the widget opens, immediately clear the badge and mark as read
  useEffect(() => {
    if (!isWidgetOpen || !user?.email) return;
    setIsClearingUnread(true);
    setUnreadCount(0);
    setIsManuallyViewed(true);
    localStorage.setItem(viewedKey, "true");
    // When we open it, we record the current unread count as "seen"
    // so we only turn red again if the count increases beyond this.
    setLastSeenCount(null); 
    markMessagesAsRead(inquiryId, role, user.email, senderId, senderName).catch(
      () => setIsClearingUnread(false),
    );
  }, [isWidgetOpen, inquiryId, role, user?.email, senderId, senderName, viewedKey]);

  useEffect(() => {
    if (!inquiryId) return;

    const unsubscribeThread = subscribeToQuotationThread(inquiryId, (thread) => {
      setThreadData(thread);
    });

    const unsubscribeMessages = subscribeToThreadMessages(inquiryId, (messages) => {
      setHasMessages(messages.length > 0);

      const clientMessages = messages.filter((message) => message.senderRole === "client");
      setHasClientMessages(clientMessages.length > 0);

      const currentUnread = messages.filter(
        (message) => !message.isRead && message.senderRole !== role,
      ).length;

      // Logic to prevent "flickering" back to red:
      // If we are currently in "viewed" mode (orange), only turn red if the 
      // actual number of unread messages has INCREASED (meaning a new message arrived).
      if ((isClearingUnread || isManuallyViewed) && lastSeenCount !== null && currentUnread > lastSeenCount) {
        setIsClearingUnread(false);
        setIsManuallyViewed(false);
        localStorage.removeItem(viewedKey);
        setLastSeenCount(null);
      } else if (currentUnread === 0) {
        // If everything is read in DB, we can clean up our manual flag
        setIsManuallyViewed(false);
        localStorage.removeItem(viewedKey);
      }

      setUnreadCount(currentUnread);
    });

    return () => {
      unsubscribeThread();
      unsubscribeMessages();
    };
  }, [inquiryId, isWidgetOpen, role, isClearingUnread, lastSeenCount, isManuallyViewed, viewedKey]);

  const handleClick = async (event: React.MouseEvent) => {
    event.stopPropagation();

    if (user?.email) {
      setIsClearingUnread(true);
      setIsManuallyViewed(true);
      localStorage.setItem(viewedKey, "true");
      setLastSeenCount(unreadCount); // Capture the current count before clearing
      setUnreadCount(0);

      try {
        await markMessagesAsRead(inquiryId, role, user.email, senderId, senderName);
      } catch (error) {
        setIsClearingUnread(false);
        setLastSeenCount(null);
        console.error("Error marking messages as read:", error);
      }
    }

    router.push(`/admin/inquiry?inquiryId=${inquiryId}&focus=messages`);
  };

  if (!hasMessages) return null;

  const isAdminOnly = !hasClientMessages;
  const isRed = unreadCount > 0 && !isClearingUnread && !isManuallyViewed;
  const isOrange = hasClientMessages && (unreadCount === 0 || isClearingUnread || isManuallyViewed);

  let envelopeColor = "text-slate-400 opacity-60";
  let shouldAnimate = false;
  let tooltipText = "Messages";

  if (isRed) {
    envelopeColor = "text-[#B9273A] drop-shadow-sm animate-bounce";
    shouldAnimate = true;
    tooltipText = unreadCount === 1 ? "New message" : `${unreadCount} new messages`;
  } else if (isOrange) {
    envelopeColor = "text-[#F69122] opacity-100";
    const senderRef = threadData?.lastMessageBy ? ` - ${threadData.lastMessageBy}` : "";
    tooltipText = `View messages${senderRef}`;
  } else if (isAdminOnly) {
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
      {isRed && (
        <span className="absolute -top-2 -right-2 min-w-[1rem] rounded-full bg-[#B9273A] px-1 text-center text-[10px] font-semibold leading-4 text-white shadow-sm">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
      {shouldAnimate && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex h-3 w-3 rounded-full bg-transparent"></span>
        </span>
      )}
    </div>
  );
}
