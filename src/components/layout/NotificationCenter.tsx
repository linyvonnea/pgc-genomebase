// Notification Center Component for Admin Dashboard
// Displays recent approval requests with real-time updates

"use client";

import React from "react";
import { Bell, Check, FileText, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useApprovalNotifications } from "@/hooks/useApprovalNotifications";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

export function NotificationCenter() {
  const router = useRouter();
  const {
    notifications,
    pendingCount,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useApprovalNotifications();

  const handleNotificationClick = (notificationId: string) => {
    markAsRead(notificationId);
    router.push("/admin/member-approvals");
  };

  const handleMarkAllRead = () => {
    markAllAsRead();
  };

  const getNotificationIcon = (type: "member" | "project") => {
    switch (type) {
      case "project":
        return <FileText className="h-4 w-4 text-purple-600" />;
      case "member":
        return <Users className="h-4 w-4 text-blue-600" />;
      default:
        return <Bell className="h-4 w-4 text-slate-600" />;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-slate-100"
        >
          <Bell className="h-5 w-5 text-slate-700" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-500"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold text-slate-900">Approval Requests</h3>
            <p className="text-xs text-slate-500">
              {pendingCount} pending approval{pendingCount !== 1 ? "s" : ""}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="text-xs"
            >
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-3 bg-slate-100 rounded-full mb-3">
                <Bell className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-700">
                No pending approvals
              </p>
              <p className="text-xs text-slate-500 mt-1">
                New submission requests will appear here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification.id)}
                  className={`w-full p-4 text-left hover:bg-slate-50 transition-colors ${
                    !notification.read ? "bg-blue-50/50" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-medium text-sm text-slate-900 leading-tight">
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mb-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>
                          {notification.submittedByName || notification.submittedBy}
                        </span>
                        <span>•</span>
                        <span>
                          {formatDistanceToNow(notification.submittedAt, {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <Separator />
        <div className="p-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push("/admin/member-approvals")}
          >
            View All Approvals
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
