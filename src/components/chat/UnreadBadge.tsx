"use client";

import React, { useState, useEffect } from "react";
import { Mail } from "lucide-react";
import { subscribeToThreadMessages } from "@/services/quotationThreadService";
import { MessageSenderRole } from "@/types/QuotationThread";

interface UnreadBadgeProps {
  inquiryId: string;
  role: MessageSenderRole;
}

export default function UnreadBadge({ inquiryId, role }: UnreadBadgeProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMessages, setHasMessages] = useState(false);

  useEffect(() => {
    if (!inquiryId) return;

    // Listen to messages for this thread
    const unsubscribe = subscribeToThreadMessages(inquiryId, (messages) => {
      setHasMessages(messages.length > 0);
      
      // Count messages that are NOT read and are NOT from us
      const unread = messages.filter((m) => !m.isRead && m.senderRole !== role).length;
      setUnreadCount(unread);
    });

    return () => unsubscribe();
  }, [inquiryId, role]);

  if (!hasMessages && unreadCount === 0) return null;

  return (
    <div className="relative flex items-center justify-center w-6 h-6 ml-1" title={unreadCount > 0 ? `${unreadCount} unread message(s)` : "Has messages"}>
      <Mail className={`w-4 h-4 ${unreadCount > 0 ? "text-blue-500" : "text-gray-400"}`} />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500 text-[9px] font-bold text-white shadow-sm ring-1 ring-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </div>
  );
}
