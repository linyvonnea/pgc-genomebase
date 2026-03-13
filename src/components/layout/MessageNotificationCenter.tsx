/**
 * MessageNotificationCenter
 *
 * Header icon that shows a red badge when clients have sent unread messages.
 * Opens a popover listing each inquiry with unread messages.
 * Clicking an item navigates to the inquiry page and opens the chat widget.
 */

"use client";

import React, { useState } from "react";
import { MessageCircle, RotateCcw, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
                    <div className="absolute left-0 top-3 bottom-3 w-1 bg-blue-600 rounded-r-full" />
                  )}

                  <div className="flex items-start gap-3">
                    {/* Client Initials Avatar */}
                    <div className="flex flex-col items-center mt-0.5">
                      <div 
                        className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm border ${
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
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <p className={`text-sm leading-tight inline ${
                              n.unreadCount > 0 ? "font-bold text-slate-900" : "font-semibold text-slate-700"
                            }`}>
                              {n.clientName}
                            </p>
                            {n.lastMessageAt && (
                              <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                {formatDistanceToNow(n.lastMessageAt, {
                                  addSuffix: true,
                                })}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Options Dropdown */}
                        <div className="flex items-center gap-1 shrink-0 -mt-1">
                          {n.unreadCount > 0 && (
                            <span className="flex-shrink-0 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold ring-2 ring-white">
                              {n.unreadCount}
                            </span>
                          )}
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all z-20"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-32">
                              {n.unreadCount === 0 && (
                                <DropdownMenuItem 
                                  onClick={(e) => handleMarkAsUnseen(e, n.inquiryId)}
                                  disabled={markingUnseenId === n.inquiryId}
                                  className="text-[11px] cursor-pointer"
                                >
                                  <RotateCcw className="mr-2 h-3.5 w-3.5" />
                                  <span>Mark Unseen</span>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                onClick={(e) => handleDismiss(e, n.inquiryId)}
                                disabled={dismissingId === n.inquiryId}
                                className="text-[11px] cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                <span>Dismiss</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      
                      {n.clientAffiliation && (
                        <p 
                          className="text-[10px] text-slate-500 leading-normal mt-1 line-clamp-2 pr-2"
                          title={n.clientAffiliation}
                        >
                          {n.clientAffiliation}
                        </p>
                      )}
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
