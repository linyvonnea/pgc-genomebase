/**
 * GlobalChatWidget
 *
 * Rendered once at the admin layout level so that the floating chat widget
 * is available on EVERY admin page — not just the inquiry page.
 *
 * It watches the URL for ?inquiryId=xxx&focus=messages and, when present,
 * mounts a FloatingChatWidget for that specific inquiry. When those params
 * are absent it renders nothing, so there is no performance cost.
 *
 * This powers the "click notification → chat opens without leaving the page"
 * experience.
 */

"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import FloatingChatWidget from "@/components/chat/FloatingChatWidget";

export default function GlobalChatWidget() {
  const searchParams = useSearchParams();
  const inquiryId = searchParams.get("inquiryId");
  const focus = searchParams.get("focus");

  // Only mount the widget when the URL explicitly requests it
  if (!inquiryId || focus !== "messages") return null;

  return (
    <FloatingChatWidget
      key={inquiryId} // remount cleanly when inquiry changes
      inquiryId={inquiryId}
      role="admin"
    />
  );
}
