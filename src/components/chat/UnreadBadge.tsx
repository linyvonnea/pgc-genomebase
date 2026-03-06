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
      const unread = messages.filter(
        (m) => !m.isRead && m.senderRole !== role,
      ).length;
      setUnreadCount(unread);
    });

    return () => unsubscribe();
  }, [inquiryId, role]);

  if (!hasMessages && unreadCount === 0) return null;

  return (
    <div
      className="relative ml-1 flex h-6 w-6 cursor-pointer items-center justify-center transition-transform hover:scale-110 active:scale-95"
      title={
        unreadCount > 0 ? `${unreadCount} new message(s)` : "Messages"
      }
    >
      <Mail
        className={`h-4 w-4 transition-colors ${
          unreadCount > 0
            ? "text-[#F69122] drop-shadow-sm" // Accent orange
            : "text-slate-400 opacity-60"
        }`}
      />
    </div>
  );
}
