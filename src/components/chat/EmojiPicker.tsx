"use client";

import React, { lazy, Suspense } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile } from "lucide-react";
import { Button } from "@/components/ui/button";

// Lazy load the heavy emoji picker library
const EmojiPickerLib = lazy(() => import("emoji-picker-react"));

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  triggerClassName?: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

export default function EmojiPicker({ 
  onEmojiSelect, 
  triggerClassName = "",
  side = "top",
  align = "end" 
}: EmojiPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 text-slate-400 hover:text-slate-600 transition-colors ${triggerClassName}`}
          type="button"
        >
          <Smile className="w-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        side={side} 
        align={align} 
        className="p-0 border-none shadow-xl w-auto z-[60]"
      >
        <Suspense fallback={
          <div className="w-[350px] h-[400px] flex items-center justify-center bg-white rounded-lg border shadow-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        }>
          <EmojiPickerLib
            onEmojiClick={(emojiData) => {
              onEmojiSelect(emojiData.emoji);
            }}
            autoFocusSearch={false}
            width={350}
            height={400}
            lazyLoadEmojis={true}
            previewConfig={{ showPreview: false }}
            skinTonesDisabled={true}
          />
        </Suspense>
      </PopoverContent>
    </Popover>
  );
}
