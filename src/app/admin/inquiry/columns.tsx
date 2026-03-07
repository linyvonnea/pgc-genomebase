/**
 * Admin Inquiry Table Column Definitions
 *
 * This file defines the column structure for the inquiry data table in the admin interface.
 * It uses TanStack Table (React Table) to create a sortable, filterable table with custom cell renderers and actions.
 */

"use client";

import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { Inquiry } from "@/types/Inquiry";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EditInquiryModal } from "@/components/forms/EditInquiryModal";
import useAuth from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { QuoteButton } from "./QuoteButton";
import { Copy, User, Eye, Mail } from "lucide-react";
import { toast } from "sonner";

/**
 * Utility function to get appropriate CSS classes for status badges
 *
 * Provides consistent color coding across the admin interface:
 * - Green: Approved clients (ready for service)
 * - Blue: Quotation only (pricing information provided)
 * - Orange: Ongoing quotation (quotation in progress)
 * - Yellow: Pending (awaiting admin review)
 *
 */
const getStatusColor = (status: string) => {
  switch (status) {
    case "Approved Client":
      return "bg-green-100 text-green-800";
    case "Quotation Only":
      return "bg-blue-100 text-blue-800";
    case "Ongoing Quotation":
      return "bg-orange-100 text-orange-800";
    case "Pending":
    default:
      return "bg-yellow-100 text-yellow-800";
  }
};

/**
 * Column definitions for the inquiry data table
 *
 * Each column defines how data should be displayed, including custom cell renderers
 * for complex data types like dates and status badges. The columns are configured
 * to work with TanStack Table's sorting and filtering features.
 */
export const columns: ColumnDef<Inquiry>[] = [
  {
    accessorKey: "id",
    header: "Inquiry ID",
    size: 200,
    cell: ({ row }) => {
      const inquiry = row.original;

      // Check if inquiry is within last 24 hours
      const isRecent = (() => {
        if (!inquiry.createdAt) return false;
        const date =
          inquiry.createdAt instanceof Date
            ? inquiry.createdAt
            : new Date(inquiry.createdAt);
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        return date >= oneDayAgo;
      })();

      // NEW badge logic:
      // 1. Show if status is "Pending" (regardless of time)
      // 2. Show if it's very recent (last 24h) EXCEPT if it's already quoted
      const isQuoted = [
        "Ongoing Quotation",
        "Approved Client",
        "Quotation Only",
      ].includes(inquiry.status);
      const showNew = (inquiry.status === "Pending" || isRecent) && !isQuoted;

      const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(inquiry.id);
          toast.success("Inquiry ID copied to clipboard");
        } catch (err) {
          toast.error("Failed to copy Inquiry ID");
        }
      };

      return (
        <div className="flex items-center gap-2">
          {showNew && (
            <Badge
              variant="destructive"
              className="h-4 px-1 text-[8px] animate-pulse shrink-0"
            >
              NEW
            </Badge>
          )}
          <span className="font-mono text-xs truncate" title={inquiry.id}>
            {inquiry.id}
          </span>
          <button
            onClick={handleCopy}
            className="p-1 hover:bg-slate-100 rounded shrink-0"
            title="Copy Inquiry ID"
          >
            <Copy className="h-3 w-3 text-slate-500" />
          </button>
        </div>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    size: 85,
    cell: ({ row }) => {
      const createdAt = row.original.createdAt;

      if (!createdAt) {
        return <span className="text-muted-foreground italic">â€”</span>;
      }

      // Ensure we have a Date object
      const date = createdAt instanceof Date ? createdAt : new Date(createdAt);

      if (isNaN(date.getTime())) {
        return <span className="text-red-500">Invalid date</span>;
      }

      // Format date for display (YYYY-MM-DD format for consistency)
      return date.toLocaleDateString("en-CA");
    },
  },
  {
    accessorKey: "name",
    header: "Name",
    size: 130,
    cell: ({ getValue }) => {
      const name = getValue() as string;
      return (
        <div className="max-w-[130px] truncate" title={name}>
          {name}
        </div>
      );
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    size: 150,
    cell: ({ getValue }) => {
      const email = (getValue() as string) || "â€”";
      return (
        <div className="max-w-[150px] truncate" title={email}>
          {email}
        </div>
      );
    },
  },
  {
    accessorKey: "affiliation",
    header: "Affiliation",
    size: 150,
    cell: ({ getValue }) => {
      const affiliation = getValue() as string;
      return (
        <div className="max-w-[150px] truncate" title={affiliation}>
          {affiliation}
        </div>
      );
    },
  },
  // Designation - Hidden for cleaner view
  // {
  //   accessorKey: "designation",
  //   header: "Designation",
  // },
  {
    accessorKey: "status",
    header: "Status",
    size: 200,
    cell: ({ row }) => {
      const router = useRouter();
      const inquiry = row.original;
      const status = inquiry.status || "Pending";
      const hasLoggedIn = inquiry.hasLoggedIn;
      const hasOpenedQuotation = inquiry.hasOpenedQuotation;

      // Render status as a colored badge
      return (
        <div className="flex items-center gap-1.5 min-w-[180px]">
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(
              status,
            )}`}
          >
            {status}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {!!hasLoggedIn && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <User className="h-4 w-4 text-green-600 fill-green-600 cursor-default" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs font-semibold">
                      Client has logged into portal
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {!!hasOpenedQuotation && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Eye
                      className="h-4 w-4 text-blue-500 cursor-default"
                      strokeWidth={3}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs font-semibold">
                      Client has viewed quotation
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      );
    },
  },
  {
    id: "message",
    header: () => <div className="text-center w-full">Message</div>,
    size: 80,
    cell: ({ row }) => {
      const router = useRouter();
      const inquiry = row.original;
      const state = inquiry.messageState ?? "none";
      const unread = inquiry.unreadMessageCount ?? 0;

      // Debugging: uncomment to see data in console
      // console.log("Inquiry Row Info:", { id: inquiry.id, state, unread });

      // No messages at all — show nothing
      if (state === "none") {
        return (
          <div className="flex justify-center opacity-10">
            <Mail className="h-4 w-4" />
          </div>
        );
      }

      let iconClass = "";
      let tooltipText = "";
      let showPing = false;

      if (state === "has_unread") {
        // Red + bounce: unread client messages
        iconClass = "text-[#B9273A] animate-bounce drop-shadow-sm";
        tooltipText = `${unread} unread message${unread > 1 ? "s" : ""}`;
        showPing = true;
      } else if (state === "all_read") {
        // Orange: client messages, all read
        iconClass = "text-[#F69122]";
        tooltipText = "Messages read";
      } else {
        // Grey: admin-only messages, no client reply
        iconClass = "text-slate-400 opacity-60";
        tooltipText = "Admin sent message";
      }

      const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        router.push(`/admin/inquiry?inquiryId=${inquiry.id}&focus=messages`);
      };

      return (
        <div className="flex justify-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-transform hover:scale-110 active:scale-95 hover:bg-slate-100"
                  onClick={handleClick}
                >
                  <Mail className={`h-4 w-4 transition-all ${iconClass}`} />
                  {showPing && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#B9273A]" />
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs font-semibold">{tooltipText}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      );
    },
  },
  {
    id: "actions", // Custom column ID since it doesn't map to data
    header: () => <div className="text-center w-full">Actions</div>,
    size: 140,
    cell: ({ row }) => {
      const inquiry = row.original;
      const router = useRouter();
      const { adminInfo } = useAuth();
      const { canEdit, canCreate, canView } = usePermissions(adminInfo?.role);

      return (
        <div className="flex items-center justify-center gap-2">
          {canCreate("quotations") && <QuoteButton inquiryId={inquiry.id} />}

          {/* Edit inquiry modal trigger - only show if user has edit permission */}
          {canEdit("inquiries") && (
            <EditInquiryModal
              key={inquiry.id} // Force re-render when inquiry changes
              inquiry={inquiry}
              onSuccess={() => router.refresh()}
            />
          )}
        </div>
      );
    },
  },
];
