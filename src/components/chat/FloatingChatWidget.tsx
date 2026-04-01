"use client";

import React, { useState, useEffect } from "react";
import { MessageCircle, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { getClientInitials } from "@/lib/chatUtils";
import { formatDistanceToNow } from "date-fns";

type NavigatorWithBadge = Navigator & {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

function base64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(normalized);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

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
  const [lastNotifiedUnread, setLastNotifiedUnread] = useState(0);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (role !== "client") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission !== "granted") return;

    const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;
    if (!publicKey) return;

    const subscribe = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        const subscription =
          existing ||
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: base64ToUint8Array(publicKey) as unknown as BufferSource,
          }));

        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            threadId: inquiryId,
            role: "client",
            subscriberId: user?.email || inquiryData?.email || "unknown-client",
            subscription: subscription.toJSON(),
          }),
        });
      } catch (error) {
        console.error("Push subscription failed:", error);
      }
    };

    subscribe();
  }, [inquiryData?.email, inquiryId, role, user?.email]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (role !== "client") return;

    const nav = navigator as NavigatorWithBadge;
    if (typeof nav.setAppBadge === "function" || typeof nav.clearAppBadge === "function") {
      if (unreadCount > 0 && typeof nav.setAppBadge === "function") {
        nav.setAppBadge(unreadCount).catch(() => {});
      }
      if (unreadCount === 0 && typeof nav.clearAppBadge === "function") {
        nav.clearAppBadge().catch(() => {});
      }
    }

    // Foreground web notification (while app/browser tab is open but hidden).
    // Background push notifications when app is fully closed still need Web Push setup.
    if (
      document.visibilityState === "hidden" &&
      unreadCount > lastNotifiedUnread &&
      Notification.permission === "granted"
    ) {
      new Notification("New message from PGC Visayas", {
        body: `You have ${unreadCount} unread message${unreadCount > 1 ? "s" : ""}.`,
        icon: "/assets/pgc-logo.png",
        badge: "/assets/pgc-logo.png",
        tag: `inquiry-${inquiryId}`,
      });
    }

    setLastNotifiedUnread(unreadCount);
  }, [inquiryId, lastNotifiedUnread, role, unreadCount]);

  const toggleOpen = () => {
    const newOpenState = !isOpen;
    
    if (!newOpenState) {
      closeWidget();
      return;
    }
    
    setIsOpen(newOpenState);

    if (newOpenState && role === "client" && typeof window !== "undefined") {
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    }

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
      className={`fixed ${role === "admin" ? "bottom-24" : "bottom-6"} right-6 z-50 flex flex-col items-end ${className || ""}`}
    >
      <AnimatePresence>
        {!isOpen && role !== "admin" && (
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
                {role === "admin" ? (
                  <Avatar className="h-10 w-10 border border-blue-500 bg-white shadow-sm">
                    <AvatarFallback className="bg-blue-50 text-sm font-semibold tracking-wide text-blue-700">
                      {getClientInitials(inquiryData?.name)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center p-1.5 shadow-sm border border-blue-500 overflow-hidden">
                    <img src="/assets/pgc-logo.png" alt="PGC Logo" className="w-full h-full object-contain" />
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="font-bold text-sm tracking-tight leading-tight">
                    {role === "admin" ? (inquiryData?.name || "Client") : "PGC Visayas Support"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {role === "admin" ? (
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${inquiryData?.online ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-400'}`}></div>
                        <span className="text-[10px] font-medium text-blue-100 uppercase tracking-widest line-clamp-1">
                          {inquiryData?.online ? "Online" : (inquiryData?.lastSeen ? `${formatDistanceToNow(inquiryData.lastSeen.toDate ? inquiryData.lastSeen.toDate() : new Date(inquiryData.lastSeen))} ago` : (inquiryData?.affiliation || "Offline"))}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                        <span className="text-[10px] font-medium text-blue-100 uppercase tracking-widest">
                          Online
                        </span>
                      </>
                    )}
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
