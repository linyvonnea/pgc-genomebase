"use client";

import Link from "next/link";
import { HelpCircle } from "lucide-react";
import useAuth from "@/hooks/useAuth";

export default function ClientLandingPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Welcome to the Client Portal</h1>
      <p className="text-muted-foreground">
        Hello {user?.displayName || user?.email}! You're signed in and ready to get started.
      </p>

      <ul className="list-disc list-inside space-y-1">
        <li>Submit your inquiry request</li>
        <li>Fill out your Client Information Sheet</li>
        <li>Complete your Project Information Sheet</li>
      </ul>

      <div className="pt-2">
        <Link
          href="/faqs"
          className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-700 hover:border-[#166FB5] hover:text-[#166FB5] hover:shadow-sm transition-all"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#166FB5]/10 text-[#166FB5]">
            <HelpCircle className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">FAQs</p>
            <p className="text-xs text-slate-500">Find answers about services, pricing, and sample submission.</p>
          </div>
        </Link>
      </div>
    </div>
  );
}