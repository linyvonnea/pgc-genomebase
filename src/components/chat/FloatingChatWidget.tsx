"use client";

import React, { useState, useEffect } from "react";
import { MessageCircle, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatBox from "@/components/chat/ChatBox";
import { MessageSenderRole } from "@/types/QuotationThread";
import UnreadBadge from "@/components/chat/UnreadBadge";
import {
  subscribeToThreadMessages,
  markMessagesAsRead,
} from "@/services/quotationThreadService";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import useAuth from "@/hooks/useAuth";

interface FloatingChatWidgetProps {
  inquiryId: string;
  role: MessageSenderRole;
  className?: string;
}

export default function FloatingChatWidget({
  inquiryId,
  role,
  className,
}: FloatingChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const searchParams = useSearchParams();
  const { user } = useAuth();

  useEffect(() => {
    if (searchParams.get("focus") === "messages") {
      setIsOpen(true);
      if (inquiryId && user) {
        markMessagesAsRead(inquiryId, role, user.email || "unknown").catch(
          console.error,
        );
      }
    }
  }, [searchParams, inquiryId, user, role]);

  useEffect(() => {
    if (!inquiryId) return;

    const unsubscribe = subscribeToThreadMessages(inquiryId, (messages) => {
      // Count messages that are NOT read and are NOT from us
      const unread = messages.filter(
        (m) => !m.isRead && m.senderRole !== role,
      ).length;
      setUnreadCount(unread);
    });

    return () => unsubscribe();
  }, [inquiryId, role]);

  const toggleOpen = () => {
    const newOpenState = !isOpen;
    setIsOpen(newOpenState);

    // If opening, mark as read immediately
    if (newOpenState && inquiryId && user) {
      markMessagesAsRead(inquiryId, role, user.email || "unknown").catch(
        console.error,
      );
    }
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex flex-col items-end ${className || ""}`}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-4 w-[350px] shadow-2xl rounded-2xl overflow-hidden border border-slate-200 bg-white"
          >
            <div className="flex items-center justify-between bg-blue-600 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                <span className="font-semibold text-sm">Messages</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="h-[400px] w-full bg-white flex flex-col">
              <ChatBox inquiryId={inquiryId} role={role} variant="floating" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleOpen}
        className="relative flex items-center justify-center p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}

        {/* Unread Badge outside */}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow-sm ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </motion.button>
    </div>
  );
}
