"use client";

import { useState } from "react";
import { Bell, FileText, CreditCard, BarChart3, MessageCircle, X, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import { ClientNotification, useClientNotifications } from "@/hooks/useClientNotifications";

interface Props {
  userEmail: string | null | undefined;
}

const typeIcon: Record<ClientNotification["type"], React.ReactNode> = {
  quotation: <FileText className="h-4 w-4 text-purple-500" />,
  chargeSlip: <CreditCard className="h-4 w-4 text-green-500" />,
  serviceReport: <BarChart3 className="h-4 w-4 text-blue-500" />,
  message: <MessageCircle className="h-4 w-4 text-indigo-500" />,
  general: <Bell className="h-4 w-4 text-slate-400" />,
};

export default function ClientNotificationBell({ userEmail }: Props) {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useClientNotifications(userEmail);

  const handleOpen = () => setOpen((v) => !v);

  const handleClickNotification = async (n: ClientNotification) => {
    if (!n.read) await markAsRead(n.id);
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors border border-slate-100"
        aria-label="Notifications"
      >
        <Bell className={`w-5 h-5 ${unreadCount > 0 ? "text-[#166FB5]" : "text-slate-500"}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4.5 min-w-[18px] rounded-full bg-red-400 animate-ping opacity-60 pointer-events-none" />
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200/60 z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-[#166FB5]" />
                <span className="text-sm font-semibold text-slate-700">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 text-[11px] text-[#166FB5] hover:underline"
                    title="Mark all as read"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    All read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 ml-1"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
                  <Bell className="h-8 w-8 opacity-30" />
                  <p className="text-xs">No notifications yet</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleClickNotification(n)}
                    className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors ${
                      !n.read ? "bg-blue-50/40" : ""
                    }`}
                  >
                    <div className="mt-0.5 shrink-0 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
                      {typeIcon[n.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs font-semibold truncate ${!n.read ? "text-slate-800" : "text-slate-600"}`}>
                          {n.title}
                        </p>
                        {!n.read && (
                          <span className="shrink-0 h-2 w-2 rounded-full bg-blue-500" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">{n.body}</p>
                      {n.createdAt && (
                        <p className="text-[10px] text-slate-400 mt-1">
                          {format(n.createdAt.toDate(), "MMM d, yyyy · h:mm a")}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
