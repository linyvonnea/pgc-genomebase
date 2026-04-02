// src/components/chat/ChatFileMessage.tsx
"use client";

import { FileText, Image, Download, Receipt } from "lucide-react";

export interface ChatAttachment {
  name: string;
  url: string;
  type: string;
  size?: number;
  isOfficialReceipt?: boolean;
}

function formatBytes(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(type: string) {
  return type.startsWith("image/");
}

interface Props {
  attachments: ChatAttachment[];
  /** "me" = sender bubble styling; "other" = receiver */
  side: "me" | "other";
}

export default function ChatFileMessage({ attachments, side }: Props) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 mt-1">
      {attachments.map((att, i) => {
        const isImg = isImage(att.type);
        const isOR = att.isOfficialReceipt || att.name.toLowerCase().includes("official-receipt");

        return (
          <a
            key={i}
            href={att.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`group flex items-center gap-2 rounded-xl px-3 py-2.5 max-w-[280px] transition-colors shadow-sm
              ${side === "me"
                ? "bg-white/20 hover:bg-white/30 text-white"
                : "bg-white border border-slate-200 hover:bg-slate-50 text-slate-800"
              }`}
          >
            {isImg ? (
              <div className="flex flex-col gap-1 w-full">
                {isOR && (
                  <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide mb-0.5 ${side === "me" ? "text-white/80" : "text-amber-600"}`}>
                    <Receipt className="w-3 h-3" />
                    Official Receipt
                  </div>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={att.url}
                  alt={att.name}
                  className="rounded-lg max-h-48 w-auto object-cover"
                />
                <span className={`text-[11px] truncate max-w-[240px] ${side === "me" ? "text-white/70" : "text-slate-500"}`}>
                  {att.name}
                </span>
              </div>
            ) : (
              <>
                <div className={`flex-shrink-0 p-1.5 rounded-lg ${side === "me" ? "bg-white/20" : isOR ? "bg-amber-50 border border-amber-200" : "bg-blue-50 border border-blue-100"}`}>
                  {isOR
                    ? <Receipt className={`w-4 h-4 ${side === "me" ? "text-white" : "text-amber-600"}`} />
                    : <FileText className={`w-4 h-4 ${side === "me" ? "text-white" : "text-blue-600"}`} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  {isOR && (
                    <div className={`text-[10px] font-bold uppercase tracking-wide ${side === "me" ? "text-white/80" : "text-amber-600"}`}>
                      Official Receipt
                    </div>
                  )}
                  <p className={`text-xs font-medium truncate ${side === "me" ? "text-white" : "text-slate-800"}`}>
                    {att.name}
                  </p>
                  {att.size && (
                    <p className={`text-[10px] ${side === "me" ? "text-white/60" : "text-slate-400"}`}>
                      {formatBytes(att.size)}
                    </p>
                  )}
                </div>
                <Download className={`w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${side === "me" ? "text-white" : "text-slate-500"}`} />
              </>
            )}
          </a>
        );
      })}
    </div>
  );
}
