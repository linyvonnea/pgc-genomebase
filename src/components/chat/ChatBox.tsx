"use client";

import React, { useState, useEffect, useRef } from "react";
import useAuth from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import TextareaAutosize from "react-textarea-autosize";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Clock, AlertCircle, Check, CheckCheck } from "lucide-react";
import { ThreadMessage, MessageSenderRole } from "@/types/QuotationThread";
import {
  subscribeToThreadMessages,
  addThreadMessage,
  markMessagesAsRead,
} from "@/services/quotationThreadService";
import { format } from "date-fns";
import { getAdminDisplayName, getClientInitials } from "@/lib/chatUtils";

interface ChatBoxProps {
  inquiryId: string;
  role: MessageSenderRole; // "admin" or "client"
  variant?: "default" | "floating";
}

export default function ChatBox({
  inquiryId,
  role,
  variant = "default",
}: ChatBoxProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!inquiryId || !user) return;

    try {
      // Subscribe to real-time messages
      const unsubscribe = subscribeToThreadMessages(
        inquiryId,
        (latestMessages) => {
          setMessages(latestMessages);
          setLoading(false);

          // Auto-mark as read for messages not from us
          // Always mark as read when messages change while the ChatBox is MOUNTED
          const unreadIds = latestMessages
            .filter((m) => !m.isRead && m.senderRole !== role)
            .map((m) => m.id as string)
            .filter(Boolean);

          if (unreadIds.length > 0) {
            markMessagesAsRead(inquiryId, role, user.email || "unknown").catch(
              console.error,
            );
          }
        },
      );

      return () => unsubscribe();
    } catch (err) {
      console.error("Error subscribing to thread:", err);
      setError("Failed to load messages.");
      setLoading(false);
    }
  }, [inquiryId, user, role]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current;
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const messageContent = newMessage.trim();
    setNewMessage(""); // Optimistic UI clear

    try {
      if (!user.email && !user.uid) {
        throw new Error("User identifier missing");
      }

      const senderDisplayName =
        role === "admin"
          ? getAdminDisplayName(user.email || user.uid)
          : user.displayName || user.email?.split("@")[0] || "Client";

      await addThreadMessage({
        threadId: inquiryId,
        type: "text",
        content: messageContent,
        senderId: user.email || user.uid,
        senderName: senderDisplayName,
        senderRole: role,
        isRead: false,
      } as Omit<ThreadMessage, "id" | "createdAt">);
    } catch (error) {
      console.error("Failed to send message:", error);
      setError("Failed to send message. Please try again.");
      setNewMessage(messageContent); // Restore on failure
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const form = (e.currentTarget as any).form;
      if (form) {
        form.requestSubmit();
      }
    }
  };

  const formatMessageTime = (msg: any) => {
    try {
      // Support for Firestore Timestamps which have toDate()
      if (msg && msg.createdAt) {
        if (typeof msg.createdAt.toDate === "function") {
          return format(msg.createdAt.toDate(), "MMM d, h:mm a");
        }
        return format(new Date(msg.createdAt), "MMM d, h:mm a");
      }
      return "Just now";
    } catch (e) {
      return "";
    }
  };

  if (!user) {
    return (
      <Card
        className={`w-full flex items-center justify-center bg-gray-50 border-gray-200 ${variant === "floating" ? "h-full border-none shadow-none" : "h-[500px]"}`}
      >
        <div className="text-center text-gray-500">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Please log in to view messages.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={`flex flex-col flex-1 relative ${variant === "floating" ? "h-full border-none shadow-none rounded-none" : "h-[500px] shadow-sm border-gray-200"}`}
    >
      {variant !== "floating" && (
        <CardHeader className="py-3 px-4 border-b bg-gray-50/50">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-700">
            <MessageCircle className="w-4 h-4 text-blue-500" />
            Activity & Messages
          </CardTitle>
        </CardHeader>
      )}

      <CardContent className="flex-1 p-0 overflow-hidden relative bg-white">
        <div ref={scrollRef} className="h-full overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex justify-center items-center h-full text-sm text-gray-400">
              Loading conversation...
            </div>
          ) : error ? (
            <div className="flex flex-col justify-center items-center h-full text-center text-red-500 space-y-2">
              <AlertCircle className="w-8 h-8 opacity-50" />
              <p className="text-sm">{error}</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-full text-center text-slate-500 space-y-3 px-6">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                <MessageCircle className="w-8 h-8 text-slate-200" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800">No messages yet.</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Have questions about your project? Send us a message and our team will get back to you shortly.
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMe = msg.senderRole === role;

              // Handle system messages dynamically
              if (msg.type === "system") {
                return (
                  <div key={msg.id || idx} className="flex justify-center my-4">
                    <span className="text-[11px] font-medium bg-gray-100 text-gray-500 px-3 py-1 rounded-full">
                      {msg.content}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id || idx}
                  className={`flex flex-col w-full ${isMe ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`flex flex-col max-w-[85%] ${isMe ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {!isMe && msg.senderRole === "client" && role === "admin" ? (
                        <Avatar className="h-5 w-5 border border-slate-200 bg-white shadow-sm">
                          <AvatarFallback className="bg-blue-50 text-[9px] font-semibold tracking-wide text-blue-700">
                            {getClientInitials(msg.senderName)}
                          </AvatarFallback>
                        </Avatar>
                      ) : !isMe && msg.senderRole === "admin" ? (
                        <>
                          <Badge
                            variant="outline"
                            className="text-[9px] h-4 py-0 px-1.5 bg-blue-50 text-blue-700 border-blue-200"
                          >
                            Admin
                          </Badge>
                          <span className="text-xs font-semibold text-gray-600">
                            {msg.senderName}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-xs font-semibold text-gray-600">
                            {isMe ? (role === "admin" ? msg.senderName : "You") : msg.senderName}
                          </span>
                        </>
                      )}
                      <span className="text-[10px] text-gray-400 flex items-center gap-1 ml-1">
                        <Clock className="w-3 h-3" />
                        {formatMessageTime(msg)}
                      </span>
                    </div>

                    <div
                      className={`px-3.5 py-2.5 text-[14px] shadow-sm ${
                        isMe
                          ? "bg-blue-600 text-white rounded-2xl rounded-tr-sm"
                          : "bg-gray-100 text-gray-800 rounded-2xl rounded-tl-sm border border-gray-100"
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed break-words">
                          {msg.content}
                        </p>
                        {isMe && (
                          <div className="flex justify-end mt-1.5 -mb-0.5">
                            {msg.isRead ? (
                              <div className="flex items-center gap-1 group/seen bg-white/10 rounded-full px-1.5 py-0.5 ml-auto translate-x-1">
                                <CheckCheck className="w-3 h-3 text-white" strokeWidth={3} />
                                <span className="text-[8px] font-bold text-white uppercase tracking-tighter">
                                  {role === "client" ? `Seen` : `Seen`}
                                </span>
                              </div>
                            ) : (
                              <Check className="w-3 h-3 text-white/50 ml-auto" strokeWidth={3} />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
            })
          )}
        </div>
      </CardContent>

      <CardFooter className="p-3 bg-white border-t rounded-b-lg">
        <form onSubmit={handleSendMessage} className="flex w-full gap-2 items-end">
          <TextareaAutosize
            placeholder={
              role === "admin" ? "Message client..." : "Message admin..."
            }
            value={newMessage}
            disabled={loading}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            minRows={2}
            maxRows={10}
            className="flex-1 w-full rounded-xl px-4 py-3 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none overflow-y-auto text-sm transition-all"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newMessage.trim() || loading}
            className="rounded-full bg-blue-600 hover:bg-blue-700 transition-colors h-10 w-10 flex-shrink-0 mb-1"
          >
            <Send className="w-[18px] h-[18px] ml-0.5" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
