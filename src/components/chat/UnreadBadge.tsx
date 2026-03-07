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

  // Detect when the chat widget is open for THIS inquiry
  const isWidgetOpen =
    searchParams.get("inquiryId") === inquiryId &&
    searchParams.get("focus") === "messages";

  // When the widget opens, immediately clear the badge and mark as read
  useEffect(() => {
    if (!isWidgetOpen || !user?.email) return;
    setIsClearingUnread(true);
    setUnreadCount(0);
    markMessagesAsRead(inquiryId, role, user.email, senderId, senderName).catch(
      () => setIsClearingUnread(false),
    );
  }, [isWidgetOpen, inquiryId, role, user?.email, senderId, senderName]);

  useEffect(() => {
    if (!inquiryId) return;

    const unsubscribeThread = subscribeToQuotationThread(inquiryId, (thread) => {
      setThreadData(thread);
    });

    const unsubscribeMessages = subscribeToThreadMessages(inquiryId, (messages) => {
      setHasMessages(messages.length > 0);

      const clientMessages = messages.filter((message) => message.senderRole === "client");
      setHasClientMessages(clientMessages.length > 0);

      const unread = messages.filter(
        (message) => !message.isRead && message.senderRole !== role,
      ).length;

      if (unread > 0) {
        setIsClearingUnread(false);
      }

      setUnreadCount(unread);
    });

    return () => {
      unsubscribeThread();
      unsubscribeMessages();
    };
  }, [inquiryId, isClearingUnread, role]);

  const handleClick = async (event: React.MouseEvent) => {
    event.stopPropagation();

    if (unreadCount > 0 && user?.email) {
      setIsClearingUnread(true);
      setUnreadCount(0);

      try {
        await markMessagesAsRead(inquiryId, role, user.email, senderId, senderName);
      } catch (error) {
        setIsClearingUnread(false);
        console.error("Error marking messages as read:", error);
      }
    }

    router.push(`/admin/inquiry?inquiryId=${inquiryId}&focus=messages`);
  };

  if (!hasMessages) return null;

  const isAdminOnly = !hasClientMessages;
  const hasUnread = unreadCount > 0 && !isClearingUnread;
  const isRead = (hasClientMessages && !hasUnread) || isClearingUnread;

  let envelopeColor = "text-slate-400 opacity-60";
  let shouldAnimate = false;
  let tooltipText = "Messages";

  if (hasUnread) {
    envelopeColor = "text-[#B9273A] drop-shadow-sm animate-bounce";
    shouldAnimate = true;
    tooltipText = unreadCount === 1 ? "New message" : `${unreadCount} new messages`;
  } else if (isRead) {
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
      {hasUnread && (
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
