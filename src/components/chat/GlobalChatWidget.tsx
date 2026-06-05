/**
 * GlobalChatWidget
 *
 * Rendered once at the admin layout level so that the floating chat widget
 * is available on EVERY admin page — not just the inquiry page.
 *
 * It watches the URL for ?inquiryId=xxx&focus=messages and, when present,
 * mounts a FloatingChatWidget for that specific inquiry. It also loads ALL
 * inquiry threads for the same client email so the admin can switch between
 * threads without leaving the page — mirroring the client portal experience.
 *
 * When the URL params are absent it renders nothing.
 */

"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import FloatingChatWidget from "@/components/chat/FloatingChatWidget";
import { subscribeToQuotationThread } from "@/services/quotationThreadService";

interface InquirySummary {
  id: string;
  status: string;
  serviceType?: string;
  createdAt?: Date | any;
}

export default function GlobalChatWidget() {
  const searchParams = useSearchParams();
  const inquiryId = searchParams.get("inquiryId");
  const focus = searchParams.get("focus");

  const [clientEmail, setClientEmail] = useState<string | null>(null);
  const [allInquiries, setAllInquiries] = useState<InquirySummary[]>([]);

  // Step 1: Subscribe to the thread to get the client's email
  useEffect(() => {
    if (!inquiryId || focus !== "messages") {
      setClientEmail(null);
      setAllInquiries([]);
      return;
    }

    const unsub = subscribeToQuotationThread(inquiryId, (thread) => {
      const email = thread?.clientEmail ?? null;
      setClientEmail((prev) => (prev === email ? prev : email));
    });

    return () => unsub();
  }, [inquiryId, focus]);

  // Step 2: When client email is known, subscribe to all their inquiries
  useEffect(() => {
    if (!clientEmail) {
      setAllInquiries([]);
      return;
    }

    const q = query(
      collection(db, "inquiries"),
      where("email", "==", clientEmail),
    );

    const unsub = onSnapshot(q, (snap) => {
      const inquiries: InquirySummary[] = snap.docs
        .map((d) => ({
          id: d.id,
          status: d.data().status ?? "",
          serviceType: d.data().serviceType ?? d.data().service ?? undefined,
          createdAt: d.data().createdAt,
        }))
        .sort((a, b) => {
          // Newest first
          const tA = a.createdAt?.toMillis?.() ?? 0;
          const tB = b.createdAt?.toMillis?.() ?? 0;
          return tB - tA;
        });
      setAllInquiries(inquiries);
    });

    return () => unsub();
  }, [clientEmail]);

  // Only mount the widget when the URL explicitly requests it
  if (!inquiryId || focus !== "messages") return null;

  return (
    <FloatingChatWidget
      key={inquiryId} // remount cleanly when inquiry changes
      inquiryId={inquiryId}
      role="admin"
      allInquiries={allInquiries.length > 1 ? allInquiries : undefined}
    />
  );
}
