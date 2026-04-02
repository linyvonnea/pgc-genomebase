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
import { MessageCircle, Send, Clock, AlertCircle, Check, CheckCheck, Paperclip, Receipt, X, Loader2 } from "lucide-react";
import { uploadFile } from "@/lib/fileUpload";
import ChatFileMessage from "./ChatFileMessage";
import { ThreadMessage, MessageSenderRole } from "@/types/QuotationThread";
import {
  subscribeToThreadMessages,
  addThreadMessage,
  markMessagesAsRead,
  toggleReaction,
} from "@/services/quotationThreadService";
import { format } from "date-fns";
import { getAdminDisplayName, getClientInitials } from "@/lib/chatUtils";
import EmojiPicker from "./EmojiPicker";

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
  const DEFAULT_REACTIONS = ["👍", "❤️", "😮", "😂", "😥"];

  // File attachment state
  const [pendingFiles, setPendingFiles] = useState<{ file: File; isOR: boolean }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const orInputRef = useRef<HTMLInputElement>(null);

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

  const handleToggleReaction = async (messageId: string | undefined, emoji: string) => {
    if (!messageId || !user) return;
    try {
      await toggleReaction(messageId, emoji, user.email || user.uid);
    } catch (err) {
      console.error("Failed to toggle reaction", err);
    }
  };

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current;
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isOR = false) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    // Validate: max 10MB each, allowed types
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    for (const f of files) {
      if (f.size > 10 * 1024 * 1024) { setError(`File "${f.name}" exceeds the 10 MB limit.`); return; }
      if (!allowed.includes(f.type)) { setError(`File type "${f.type}" is not allowed.`); return; }
    }
    setError(null);
    setPendingFiles((prev) => [...prev, ...files.map((file) => ({ file, isOR }))]);
    e.target.value = "";
  };

  const removePendingFile = (idx: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && pendingFiles.length === 0) return;
    if (!user) return;

    const messageContent = newMessage.trim();
    const filesToSend = [...pendingFiles];

    try {
      if (!user.email && !user.uid) {
        throw new Error("User identifier missing");
      }

      const senderDisplayName =
        role === "admin"
          ? getAdminDisplayName(user.email || user.uid)
          : user.displayName || user.email?.split("@")[0] || "Client";

      setNewMessage(""); // Optimistic UI clear
      setPendingFiles([]);

      // Use a more descriptive sender name for the initials generation if this is a client message
      let finalSenderName = senderDisplayName;
      if (role === "client" && user.displayName) {
        finalSenderName = user.displayName;
      }

      // Upload pending attachments to Firebase Storage
      let attachments: { name: string; url: string; type: string; size: number; isOfficialReceipt?: boolean }[] = [];
      if (filesToSend.length > 0) {
        setUploading(true);
        try {
          attachments = await Promise.all(
            filesToSend.map(async ({ file, isOR }) => {
              const folder = isOR ? `official-receipts/${inquiryId}` : `chat-attachments/${inquiryId}`;
              const url = await uploadFile(file, folder);
              return { name: file.name, url, type: file.type, size: file.size, isOfficialReceipt: isOR };
            })
          );
        } finally {
          setUploading(false);
        }
      }

      await addThreadMessage({
        threadId: inquiryId,
        type: "text",
        content: messageContent || (attachments.length > 0 ? "📎 Attached file(s)" : ""),
        senderId: user.email || user.uid,
        senderName: finalSenderName,
        senderRole: role,
        isRead: false,
        attachments: attachments.length > 0 ? attachments : undefined,
      } as Omit<ThreadMessage, "id" | "createdAt">);
    } catch (error) {
      console.error("Failed to send message:", error);
      setError("Failed to send message. Please try again.");
      setNewMessage(messageContent); // Restore on failure
      setPendingFiles(filesToSend as any);
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
                          {msg.content !== "📎 Attached file(s)" ? msg.content : ""}
                        </p>
                        {msg.attachments && msg.attachments.length > 0 && (
                          <ChatFileMessage
                            attachments={msg.attachments as any}
                            side={isMe ? "me" : "other"}
                          />
                        )}

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
        {/* Hidden file inputs */}
        <input ref={fileInputRef} type="file" multiple className="hidden" accept="image/*,.pdf,.doc,.docx" onChange={(e) => handleFileSelect(e, false)} />
        <input ref={orInputRef} type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => handleFileSelect(e, true)} />

        <form onSubmit={handleSendMessage} className="flex flex-col w-full gap-2">
          {/* Pending file preview chips */}
          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pb-1">
              {pendingFiles.map((pf, i) => (
                <div key={i} className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border ${pf.isOR ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-blue-50 border-blue-100 text-blue-700"}`}>
                  {pf.isOR && <Receipt className="w-3 h-3" />}
                  <span className="max-w-[140px] truncate">{pf.file.name}</span>
                  <button type="button" onClick={() => removePendingFile(i)} className="ml-0.5 hover:opacity-70">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 items-end">
            {/* Attach file */}
            <button
              type="button"
              title="Attach file"
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors mb-1"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Official Receipt — client only */}
            {role === "client" && (
              <button
                type="button"
                title="Upload Official Receipt"
                onClick={() => orInputRef.current?.click()}
                className="flex-shrink-0 p-2 rounded-full text-amber-500 hover:bg-amber-50 transition-colors mb-1"
              >
                <Receipt className="w-4 h-4" />
              </button>
            )}

            <div className="flex-1 relative flex items-end">
              <TextareaAutosize
                placeholder={
                  role === "admin" ? "Message client..." : "Message admin..."
                }
                value={newMessage}
                disabled={loading || uploading}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                minRows={2}
                maxRows={10}
                className="flex-1 w-full rounded-xl pl-4 pr-10 py-3 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none overflow-y-auto text-sm transition-all"
              />
              <div className="absolute right-2 bottom-2.5">
                <EmojiPicker onEmojiSelect={(emoji) => setNewMessage((prev) => prev + emoji)} />
              </div>
            </div>

            <Button
              type="submit"
              size="icon"
              disabled={(!newMessage.trim() && pendingFiles.length === 0) || loading || uploading}
              className="rounded-full bg-blue-600 hover:bg-blue-700 transition-colors h-10 w-10 flex-shrink-0 mb-1"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-[18px] h-[18px] ml-0.5" />}
            </Button>
          </div>
        </form>
      </CardFooter>
    </Card>
  );
}
