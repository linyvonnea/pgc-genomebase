"use client";

import React, { useState, useEffect } from "react";
import { Mail } from "lucide-react";
import { subscribeToThreadMessages, markMessagesAsRead } from "@/services/quotationThreadService";
import { MessageSenderRole } from "@/types/QuotationThread";
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

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // If there are unread messages, mark them as read
    if (unreadCount > 0 && user?.email) {
      try {
        await markMessagesAsRead(inquiryId, role, user.email);
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
    }
    
    // Navigate to the inquiry details after marking as read
    router.push(`/admin/inquiry?inquiryId=${inquiryId}&focus=messages`);
  };

  if (!hasMessages && unreadCount === 0) return null;

  return (
    <div
      className="relative ml-1 flex h-6 w-6 cursor-pointer items-center justify-center transition-transform hover:scale-110 active:scale-95"
      onClick={handleClick}
      title={
        unreadCount > 0 ? `${unreadCount} new message(s)` : "Messages"
      }
    >
      <Mail
        className={`h-4 w-4 transition-all ${
          unreadCount > 0
            ? "text-[#B9273A] drop-shadow-sm animate-bounce"
            : "text-[#F69122] opacity-100" // Turns orange when read/no new messages
        }`}
      />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#B9273A]"></span>
        </span>
      )}
    </div>
  );
}
