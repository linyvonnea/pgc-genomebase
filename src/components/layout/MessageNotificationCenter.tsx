/**
 * MessageNotificationCenter
 *
 * Header icon that shows a red badge when clients have sent unread messages.
 * Opens a popover listing each inquiry with unread messages.
 * Clicking an item navigates to the inquiry page and opens the chat widget.
 */

"use client";

import React, { useState } from "react";
import { MessageCircle, RotateCcw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useMessageNotifications } from "@/hooks/useMessageNotifications";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { 
  markLatestClientMessageAsUnseen,
  dismissThreadNotification
} from "@/services/quotationThreadService";
import { X } from "lucide-react";

export function MessageNotificationCenter() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [markingUnseenId, setMarkingUnseenId] = useState<string | null>(null);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const { notifications, totalUnread, markViewed, markAllViewed } =
    useMessageNotifications();

  const handleNotificationClick = (inquiryId: string) => {
    markViewed(inquiryId);
    setOpen(false);
    router.push(`/admin/inquiry?inquiryId=${inquiryId}&focus=messages`);
  };

  const handleDismiss = async (event: React.MouseEvent, inquiryId: string) => {
    event.stopPropagation();
    if (dismissingId) return;

    try {
      setDismissingId(inquiryId);
      await dismissThreadNotification(inquiryId);
      toast.success("Notification dismissed");
    } catch (error) {
      toast.error("Failed to dismiss notification");
    } finally {
      setDismissingId(null);
    }
  };

  const handleMarkAsUnseen = async (
    event: React.MouseEvent,
    inquiryId: string,
  ) => {
    event.stopPropagation();
    if (markingUnseenId === inquiryId) return;

    try {
      setMarkingUnseenId(inquiryId);
      const nextUnread = await markLatestClientMessageAsUnseen(inquiryId);
      if (nextUnread > 0) {
        toast.success("Marked client message as unseen");
      } else {
        toast.info("No seen client message available to mark as unseen");
      }
    } catch (error) {
      toast.error("Failed to mark message as unseen");
    } finally {
      setMarkingUnseenId(null);
    }
  };

  const unviewedCount = notifications.filter((n) => !n.viewed).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-slate-100"
          aria-label={
            totalUnread > 0
              ? `${totalUnread} unread client message${totalUnread !== 1 ? "s" : ""}`
              : "Client messages"
          }
        >
          <MessageCircle className="h-5 w-5 text-slate-700" />
          {totalUnread > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-500 animate-pulse"
            >
              {totalUnread > 9 ? "9+" : totalUnread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold text-slate-900">Client Messages</h3>
            <p className="text-xs text-slate-500">
              {totalUnread > 0
                ? `${totalUnread} unread message${totalUnread !== 1 ? "s" : ""}`
                : "All caught up!"}
            </p>
          </div>
        </div>

        {/* List */}
        <ScrollArea className="h-[360px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="p-3 bg-slate-100 rounded-full mb-3">
                <MessageCircle className="h-7 w-7 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-700">No new messages</p>
              <p className="text-xs text-slate-500 mt-1">
                New client messages will appear here
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((n, index) => (
                <div
                  key={n.inquiryId}
                  onClick={() => handleNotificationClick(n.inquiryId)}
                  className={`w-full px-4 py-3 text-left hover:bg-slate-50 transition-all group relative cursor-pointer border-b border-slate-100 last:border-0 ${
                    n.unreadCount > 0 ? "bg-blue-50/30" : "bg-white"
                  }`}
                >
                  {/* Status Indicator Bar */}
                  {n.unreadCount > 0 && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />
                  )}

                  <div className="flex items-start gap-4">
                    {/* Client Initials Avatar - Smaller */}
                    <div 
                      className={`flex-shrink-0 mt-0.5 h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold shadow-sm border ${
                        n.unreadCount > 0 
                          ? "bg-blue-600 text-white border-blue-500" 
                          : "bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 border-slate-200"
                      }`}
                    >
                      {n.clientName
                        ? (() => {
                            const words = n.clientName.trim().split(/\s+/);
                            if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
                            return (words[0][0] + words[words.length - 1][0]).toUpperCase();
                          })()
                        : "?"}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-sm truncate leading-tight ${
                          n.unreadCount > 0 ? "font-bold text-slate-900" : "font-semibold text-slate-700"
                        }`}>
                          {n.clientName}
                        </p>
                        <div className="flex items-center gap-1 shrink-0 -mt-1 -mr-1">
                          {n.unreadCount > 0 && (
                            <span className="flex-shrink-0 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold ring-2 ring-white">
                              {n.unreadCount}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleDismiss(e, n.inquiryId)}
                            disabled={dismissingId === n.inquiryId}
                            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-red-500 transition-all relative z-20 bg-white shadow-sm border border-slate-100"
                            title="Dismiss notification"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      
                      {n.clientAffiliation && (
                        <p className="text-[10px] text-slate-500 truncate leading-tight mt-0.5">
                          {n.clientAffiliation}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-1 gap-2">
                        {n.lastMessageAt && (
                          <p className="text-[9px] text-slate-400 shrink-0">
                            {formatDistanceToNow(n.lastMessageAt, {
                              addSuffix: true,
                            })}
                          </p>
                        )}

                        {n.unreadCount === 0 && (
                          <div className="flex-1 flex justify-end pr-8">
                            <button
                              type="button"
                              onClick={(event) => handleMarkAsUnseen(event, n.inquiryId)}
                              disabled={markingUnseenId === n.inquiryId}
                              className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 transition-colors"
                              title="Mark latest seen client message as unseen"
                            >
                              <RotateCcw className="h-2.5 w-2.5" />
                              Mark unseen
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Unread Status Dot */}
                    {n.unreadCount > 0 && (
                      <div className="flex-shrink-0 self-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
