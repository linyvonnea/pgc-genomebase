"use client";

/**
 * AdminChatWidget
 *
 * Floating direct-message chat panel for admin-to-admin communication.
 * Renders at the bottom-left of every admin page so it never overlaps
 * the client-facing GlobalChatWidget (bottom-right).
 *
 * UX flow:
 *   1. Floating button (bottom-left) shows total unread badge.
 *   2. Click → panel opens with list of all other admins.
 *   3. Click an admin → DM thread opens with message history.
 *   4. Back arrow → returns to admin list.
 *   5. "Seen" indicator under sent messages when peer has read them.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { X, ChevronLeft, Send, Users, Check, CheckCheck, MessageSquare, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import TextareaAutosize from "react-textarea-autosize";
import { format } from "date-fns";
import EmojiPicker from "./EmojiPicker";
import useAuth from "@/hooks/useAuth";
import usePresenceStatus from "@/hooks/usePresenceStatus";
import { startPresence } from "@/services/presenceService";
import PresenceIndicator from "./PresenceIndicator";
import { getAllAdmins, Admin } from "@/services/adminService";
import {
  getOrCreateDMChannel,
  sendAdminMessage,
  subscribeToAdminChannels,
  subscribeToAdminMessages,
  markAdminMessagesRead,
  emailToKey,
} from "@/services/adminChatService";
import { AdminChannel, AdminMessage } from "@/types/AdminChat";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

function formatMsgTime(ts: any): string {
  try {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return format(d, "h:mm a");
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// SelectedAdminHeader — uses a hook so it must be its own component
// ---------------------------------------------------------------------------

interface SelectedAdminHeaderProps {
  admin: Admin;
  onBack: () => void;
}

function SelectedAdminHeader({ admin, onBack }: SelectedAdminHeaderProps) {
  const presence = usePresenceStatus(admin.email);
  return (
    <>
      <button
        onClick={onBack}
        className="p-1 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
        aria-label="Back to admin list"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <div className="relative flex-shrink-0">
        <Avatar className="h-8 w-8 border border-white/30 bg-white/10">
          <AvatarFallback className="bg-white/20 text-white text-xs font-bold">
            {getInitials(admin.name)}
          </AvatarFallback>
        </Avatar>
        {presence.isOnline && (
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-[#166FB5]" />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-tight truncate">{admin.name}</p>
        <PresenceIndicator
          isOnline={presence.isOnline}
          lastSeen={presence.lastSeen}
          offlineLabel={admin.position}
          variant="light"
        />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// AdminListItem — isolated so it can call hooks per admin row
// ---------------------------------------------------------------------------

interface AdminListItemProps {
  admin: Admin;
  unread: number;
  preview: string;
  onClick: () => void;
}

function AdminListItem({ admin, unread, preview, onClick }: AdminListItemProps) {
  const presence = usePresenceStatus(admin.email);
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 text-left"
    >
      <div className="relative flex-shrink-0">
        <Avatar className="h-10 w-10 border border-slate-200">
          <AvatarFallback className="bg-[#166FB5]/10 text-[#166FB5] text-sm font-bold">
            {getInitials(admin.name)}
          </AvatarFallback>
        </Avatar>
        {/* Online dot overlay */}
        {presence.isOnline && (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-white" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{admin.name}</p>
        <PresenceIndicator
          isOnline={presence.isOnline}
          lastSeen={presence.lastSeen}
          offlineLabel={preview}
          variant="dark"
          className="mt-0.5"
        />
      </div>

      {unread > 0 && (
        <span className="flex-shrink-0 h-5 min-w-[20px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminChatWidget() {
  const { user, adminInfo, isAdmin } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [channels, setChannels] = useState<AdminChannel[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // ------------------------------------------------------------------
  // Bootstrap
  // ------------------------------------------------------------------

  // Load all admins once on mount
  useEffect(() => {
    getAllAdmins().then(setAdmins).catch(console.error);
  }, []);

  // Subscribe to channels for the current admin
  useEffect(() => {
    if (!user?.email) return;
    const unsub = subscribeToAdminChannels(user.email, setChannels);
    return () => unsub();
  }, [user?.email]);

  // ------------------------------------------------------------------
  // DM thread handling
  // ------------------------------------------------------------------

  useEffect(() => {
    if (!activeChannelId) {
      setMessages([]);
      return;
    }
    setLoadingMessages(true);
    const unsub = subscribeToAdminMessages(activeChannelId, (msgs) => {
      setMessages(msgs);
      setLoadingMessages(false);
    });
    return () => unsub();
  }, [activeChannelId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Mark thread as read whenever it is visible
  useEffect(() => {
    if (!activeChannelId || !user?.email || !isOpen) return;
    markAdminMessagesRead(activeChannelId, user.email).catch(console.error);
  }, [activeChannelId, user?.email, isOpen, messages.length]);

  // ------------------------------------------------------------------
  // Computed values
  // ------------------------------------------------------------------

  const myEmail = user?.email ?? "";

  // Sort admins by most recent channel activity; admins with no channel go to the end
  const otherAdmins = useMemo(() => {
    const others = admins.filter((a) => a.email !== myEmail);
    return others.sort((a, b) => {
      const chA = channels.find(
        (c) => c.participants.includes(a.email) && c.participants.includes(myEmail),
      );
      const chB = channels.find(
        (c) => c.participants.includes(b.email) && c.participants.includes(myEmail),
      );
      const tA = chA?.lastMessageAt?.toMillis?.() ?? chA?.createdAt?.toMillis?.() ?? 0;
      const tB = chB?.lastMessageAt?.toMillis?.() ?? chB?.createdAt?.toMillis?.() ?? 0;
      return tB - tA;
    });
  }, [admins, channels, myEmail]);

  // Filtered admin list based on search query
  const filteredAdmins = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return otherAdmins;
    return otherAdmins.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.position.toLowerCase().includes(q),
    );
  }, [otherAdmins, searchQuery]);

  const totalUnread = channels.reduce((sum, ch) => {
    const key = emailToKey(myEmail);
    return sum + (ch.unreadCounts?.[key] ?? 0);
  }, 0);

  const getChannelFor = useCallback(
    (adminEmail: string) =>
      channels.find(
        (ch) =>
          ch.participants.includes(adminEmail) &&
          ch.participants.includes(myEmail),
      ),
    [channels, myEmail],
  );

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------

  const handleSelectAdmin = async (admin: Admin) => {
    if (!myEmail || !adminInfo) return;
    setSelectedAdmin(admin);
    const channelId = await getOrCreateDMChannel(
      myEmail,
      adminInfo.name,
      admin.email,
      admin.name,
    );
    setActiveChannelId(channelId);
  };

  const handleBack = () => {
    setSelectedAdmin(null);
    setActiveChannelId(null);
    setMessages([]);
    setNewMessage("");
  };

  const handleSend = async () => {
    const content = newMessage.trim();
    if (!content || !activeChannelId || !myEmail || !adminInfo || sending) return;
    setSending(true);
    setNewMessage("");
    try {
      await sendAdminMessage(activeChannelId, myEmail, adminInfo.name, content);
    } catch (err) {
      console.error("AdminChat send error:", err);
      setNewMessage(content); // restore on failure
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleToggle = () => {
    setIsOpen((v) => !v);
  };

  // Publish my own online presence
  useEffect(() => {
    if (!user?.email) return;
    return startPresence(user.email, "admin");
  }, [user?.email]);

  // Don't render for non-admin users
  if (!isAdmin) return null;

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="admin-chat-panel"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="mb-4 w-[340px] shadow-2xl rounded-2xl overflow-hidden border border-slate-200 bg-white"
          >
            {/* ---- Header ---- */}
            <div className="flex items-center justify-between bg-gradient-to-r from-[#166FB5] to-[#4038AF] px-4 py-3 text-white">
              <div className="flex items-center gap-2 min-w-0">
                {selectedAdmin ? (
                  <SelectedAdminHeader admin={selectedAdmin} onBack={handleBack} />
                ) : (
                  <>
                    <Users className="w-4 h-4 text-white/80 flex-shrink-0" />
                    <span className="font-bold text-sm">Team Chat</span>
                  </>
                )}
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors text-white/80 hover:text-white flex-shrink-0 ml-2"
                aria-label="Close team chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ---- Search bar (admin list only) ---- */}
            {!selectedAdmin && (
              <div className="px-3 py-2 border-b border-slate-100 bg-white">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search admins…"
                    className="w-full text-sm pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {/* ---- Body ---- */}
            {selectedAdmin ? (
              /* DM Thread */
              <div className="flex flex-col" style={{ height: 420 }}>
                {/* Messages */}
                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/60"
                >
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full text-sm text-slate-400">
                      Loading…
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 space-y-2 px-6">
                      <MessageSquare className="w-10 h-10 text-slate-200" />
                      <p className="text-xs text-slate-500 font-medium">
                        No messages yet — say hi!
                      </p>
                    </div>
                  ) : (
                    messages.map((msg, i) => {
                      const isMe = msg.senderId === myEmail;
                      const seen =
                        isMe &&
                        Array.isArray(msg.readBy) &&
                        msg.readBy.some((e) => e !== myEmail);

                      return (
                        <div
                          key={msg.id ?? i}
                          className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                        >
                          <div
                            className={`max-w-[82%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
                              isMe
                                ? "bg-[#166FB5] text-white rounded-tr-sm"
                                : "bg-white text-slate-800 rounded-tl-sm border border-slate-100"
                            }`}
                          >
                            {!isMe && (
                              <p className="text-[10px] font-bold text-[#166FB5] mb-0.5">
                                {msg.senderName}
                              </p>
                            )}
                            <p className="whitespace-pre-wrap break-words">
                              {msg.content}
                            </p>
                            {/* Seen indicator for sent messages */}
                            {isMe && (
                              <div className="flex justify-end mt-1 -mb-0.5">
                                {seen ? (
                                  <div className="flex items-center gap-1 bg-white/10 rounded-full px-1.5 py-0.5">
                                    <CheckCheck className="w-3 h-3 text-white" strokeWidth={3} />
                                    <span className="text-[8px] font-bold text-white uppercase tracking-tight">
                                      Seen
                                    </span>
                                  </div>
                                ) : (
                                  <Check className="w-3 h-3 text-white/50" strokeWidth={3} />
                                )}
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 mt-0.5 px-1">
                            {formatMsgTime(msg.createdAt)}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Input */}
                <div className="p-3 border-t bg-white flex-shrink-0">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSend();
                    }}
                    className="flex gap-2 items-end"
                  >
                    <div className="flex-1 relative flex items-end min-w-0">
                      <TextareaAutosize
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`Message ${selectedAdmin.name.split(" ")[0]}…`}
                        minRows={1}
                        maxRows={5}
                        className="flex-1 text-sm pl-3 pr-9 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none overflow-hidden"
                      />
                      <div className="absolute right-2 bottom-1.5 grayscale hover:grayscale-0 transition-all">
                        <EmojiPicker onEmojiSelect={(emoji) => setNewMessage((prev) => prev + emoji)} />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      size="icon"
                      disabled={!newMessage.trim() || sending}
                      className="rounded-full bg-[#166FB5] hover:bg-blue-700 h-9 w-9 flex-shrink-0 mb-0.5"
                    >
                      <Send className="w-4 h-4 ml-0.5" />
                    </Button>
                  </form>
                </div>
              </div>
            ) : (
              /* Admin List */
              <div className="max-h-[400px] overflow-y-auto">
                {filteredAdmins.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">
                    {searchQuery.trim() ? "No admins match your search." : "No other admins found."}
                  </div>
                ) : (
                  filteredAdmins.map((admin) => {
                    const channel = getChannelFor(admin.email);
                    const unread = channel?.unreadCounts?.[emailToKey(myEmail)] ?? 0;
                    const preview = channel?.lastMessagePreview ?? admin.position;
                    return (
                      <AdminListItem
                        key={admin.email}
                        admin={admin}
                        unread={unread}
                        preview={preview}
                        onClick={() => handleSelectAdmin(admin)}
                      />
                    );
                  })
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Toggle button ---- */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleToggle}
        className="relative flex items-center justify-center p-4 bg-gradient-to-br from-[#166FB5] to-[#4038AF] text-white rounded-full shadow-lg hover:shadow-xl transition-shadow"
        aria-label="Toggle team chat"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Users className="w-6 h-6" />
        )}

        {!isOpen && totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white ring-2 ring-white">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </motion.button>
    </div>
  );
}
