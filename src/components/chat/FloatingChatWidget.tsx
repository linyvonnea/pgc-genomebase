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
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { subscribeToInquiryById } from "@/services/inquiryService";
import { Inquiry } from "@/types/Inquiry";

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
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [inquiryData, setInquiryData] = useState<Inquiry | null>(null);

  useEffect(() => {
    if (!inquiryId) return;
    const unsubscribe = subscribeToInquiryById(inquiryId, (data) => {
      setInquiryData(data);
    });
    return () => unsubscribe();
  }, [inquiryId]);

  const closeWidget = () => {
    setIsOpen(false);
    if (searchParams.get("focus") === "messages" && searchParams.get("inquiryId") === inquiryId) {
      // Create new URLSearchParams without focus and inquiryId
      const params = new URLSearchParams(searchParams.toString());
      params.delete("focus");
      params.delete("inquiryId");
      
      const newQuery = params.toString();
      router.replace(pathname + (newQuery ? `?${newQuery}` : ""), { scroll: false });
    }
  };

  useEffect(() => {
    if (searchParams.get("focus") === "messages" && searchParams.get("inquiryId") === inquiryId) {
      setIsOpen(true);
      if (inquiryId) {
        markMessagesAsRead(
          inquiryId, 
          role, 
          user?.email || "admin",
          inquiryData?.email || undefined,
          inquiryData?.name || undefined
        ).catch(console.error);
      }
    }
  }, [searchParams, inquiryId, user, role, inquiryData]);

  useEffect(() => {
    if (!inquiryId) return;

    const unsubscribe = subscribeToThreadMessages(inquiryId, (messages) => {
      // Count messages that are NOT read and are NOT from us
      const unread = messages.filter(
        (m) => !m.isRead && m.senderRole !== role,
      ).length;

      // If the chat widget is currently open or messages are being continuously viewed, mark them as read immediately
      if (isOpen && unread > 0) {
        markMessagesAsRead(
          inquiryId, 
          role, 
          user?.email || "admin",
          inquiryData?.email || undefined,
          inquiryData?.name || undefined
        ).catch(console.error);
      }

      setUnreadCount(unread);
    });

    return () => unsubscribe();
  }, [inquiryId, role, isOpen, user]);

  const toggleOpen = () => {
    const newOpenState = !isOpen;
    
    if (!newOpenState) {
      closeWidget();
      return;
    }
    
    setIsOpen(newOpenState);

    // If opening, mark as read immediately
    if (newOpenState && inquiryId) {
      markMessagesAsRead(
        inquiryId, 
        role, 
        user?.email || "admin",
        inquiryData?.email || undefined,
        inquiryData?.name || undefined
      ).catch(console.error);
    }
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex flex-col items-end ${className || ""}`}
    >
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="mb-2 mr-2 bg-white px-3 py-1.5 rounded-full shadow-lg border border-blue-100 flex items-center gap-2 pointer-events-none"
          >
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              Talk to us
            </span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
          </motion.div>
        )}

        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-4 w-[350px] shadow-2xl rounded-2xl overflow-hidden border border-slate-200 bg-white"
          >
            <div className="flex items-center justify-between bg-blue-600 px-4 py-3 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center p-1.5 shadow-sm border border-blue-500">
                  <img src="/assets/pgc-logo.png" alt="PGC Logo" className="w-full h-full object-contain" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm tracking-tight leading-tight">
                    PGC Visayas Support
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                    <span className="text-[10px] font-medium text-blue-100 uppercase tracking-widest">
                      Online
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={closeWidget}
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
