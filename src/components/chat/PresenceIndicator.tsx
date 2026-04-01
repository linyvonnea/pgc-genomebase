"use client";

import React from "react";
import { formatDistanceToNow } from "date-fns";
import { Timestamp } from "firebase/firestore";

interface PresenceIndicatorProps {
  isOnline: boolean;
  lastSeen: Timestamp | null;
  /** Label shown when online. Defaults to "Online" */
  onlineLabel?: string;
  /** Override the offline text. Falls back to "Active X ago" from lastSeen. */
  offlineLabel?: string;
  /**
   * "light" — white/pale text + green glow, for use on dark/coloured headers.
   * "dark"  — slate text + standard green, for use on white backgrounds.
   */
  variant?: "light" | "dark";
  className?: string;
}

export default function PresenceIndicator({
  isOnline,
  lastSeen,
  onlineLabel = "Online",
  offlineLabel,
  variant = "dark",
  className = "",
}: PresenceIndicatorProps) {
  const lastSeenText = React.useMemo(() => {
    if (!lastSeen) return offlineLabel || "Offline";
    try {
      const date = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen as any);
      const ago = formatDistanceToNow(date, { addSuffix: true });
      return offlineLabel ? `${offlineLabel} • ${ago}` : `Active ${ago}`;
    } catch {
      return offlineLabel || "Offline";
    }
  }, [lastSeen, offlineLabel]);

  const dotOfflineColor =
    variant === "light" ? "bg-white/30" : "bg-slate-300";

  const textOfflineColor =
    variant === "light" ? "text-white/60" : "text-slate-400";

  const textOnlineColor =
    variant === "light" ? "text-emerald-300" : "text-emerald-600";

  if (isOnline) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`} title="Online">
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <span className={`h-2 w-2 rounded-full flex-shrink-0 ${dotOfflineColor}`} />
      <span className={`text-[10px] ${textOfflineColor}`}>{lastSeenText}</span>
    </div>
  );
}
