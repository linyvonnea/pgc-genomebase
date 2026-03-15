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
import UnreadBadge from "@/components/chat/UnreadBadge";
import { Copy, User, Eye } from "lucide-react";
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
    case "Service Not Offered":
      return "bg-slate-100 text-slate-500 border-slate-200 opacity-70";
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
    header: "ID",
    size: 110, // Increased size to display the complete inquiry ID
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

      const shortId = inquiry.id.slice(0, 8);

      return (
        <div className="flex items-center gap-2 w-full">
          {showNew && (
            <Badge
              variant="destructive"
              className="h-3 px-1 text-[7px] animate-pulse shrink-0"
            >
              N
            </Badge>
          )}
          <span className="font-mono text-xs truncate flex-1" title={inquiry.id}>
            {inquiry.id}
          </span>
          <button
            onClick={handleCopy}
            className="p-0.5 hover:bg-slate-100 rounded shrink-0"
            title="Copy Inquiry ID"
          >
            <Copy className="h-2.5 w-2.5 text-slate-400" />
          </button>
        </div>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    size: 70, // Compressed
    cell: ({ row }) => {
      const createdAt = row.original.createdAt;

      if (!createdAt) {
        return <span className="text-muted-foreground italic">—</span>;
      }

      // Ensure we have a Date object
      const date = createdAt instanceof Date ? createdAt : new Date(createdAt);

      if (isNaN(date.getTime())) {
        return <span className="text-red-500 text-[10px]">Invalid</span>;
      }

      // Format date for display (MM-DD-YYYY format)
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      
      return (
        <span className="text-slate-500 font-medium tabular-nums text-[11px]">
          {`${month}-${day}-${year}`}
        </span>
      );
    },
  },
  {
    accessorKey: "name",
    header: "Name",
    size: 110, // Reduced per request; tooltip shows full value
    cell: ({ getValue }) => {
      const name = getValue() as string;

      const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(name);
          toast.success("Name copied to clipboard");
        } catch (err) {
          toast.error("Failed to copy Name");
        }
      };

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 group w-full cursor-help">
                <span className="truncate text-[11px] font-semibold text-slate-700 flex-1">
                  {name}
                </span>
                <button
                  onClick={handleCopy}
                  className="p-1 hover:bg-slate-100 rounded shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Copy Name"
                >
                  <Copy className="h-2.5 w-2.5 text-slate-400" />
                </button>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[300px] break-words">
              <p className="text-xs font-semibold">{name}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    size: 100, // Reduced from 120 per request
    cell: ({ getValue }) => {
      const email = (getValue() as string) || "—";

      const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (email === "—") return;
        try {
          await navigator.clipboard.writeText(email);
          toast.success("Email copied to clipboard");
        } catch (err) {
          toast.error("Failed to copy Email");
        }
      };

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 group w-full cursor-help">
                <span className="truncate text-[11px] text-slate-400 flex-1">
                  {email}
                </span>
                {email !== "—" && (
                  <button
                    onClick={handleCopy}
                    className="p-1 hover:bg-slate-100 rounded shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Copy Email"
                  >
                    <Copy className="h-2.5 w-2.5 text-slate-400" />
                  </button>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[300px] break-words">
              <p className="text-xs font-semibold">{email}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    accessorKey: "affiliation",
    header: "Affiliation",
    size: 95, // Reduced per request; tooltip shows full value
    cell: ({ getValue }) => {
      const affiliation = getValue() as string;
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full truncate text-[11px] text-slate-500 font-medium cursor-help">
                {affiliation}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[300px] break-words">
              <p className="text-xs font-semibold">{affiliation}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    accessorKey: "serviceType",
    header: "Svc",
    size: 45, // Minimum possible
    cell: ({ getValue }) => {
      const serviceType = getValue() as string;
      if (!serviceType) return <span className="text-muted-foreground italic">—</span>;
      
      // Shorten/Capitalize
      const getShortType = (type: string) => {
        const map: Record<string, string> = {
          'laboratory': 'Lab',
          'bioinformatics': 'Bio',
          'equipment': 'Equip',
          'retail': 'Ret',
          'research': 'Res',
          'training': 'Trn'
        };
        return map[type.toLowerCase()] || type;
      };

      return (
        <div className="font-semibold text-slate-500 text-[10px] uppercase">
          {getShortType(serviceType)}
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
    size: 180, // Expanded slightly to provide more breathing room for labels and icons
    cell: ({ row }) => {
      const router = useRouter();
      const inquiry = row.original;
      const status = inquiry.status || "Pending";
      const hasLoggedIn = inquiry.hasLoggedIn;
      const hasOpenedQuotation = inquiry.hasOpenedQuotation;

      // Render status as a colored badge with fixed width and trailing icons
      return (
        <div className="flex items-center gap-2 w-full pr-1">
          <div className="w-[72%] flex-shrink-0">
            <span
              className={`block w-full px-1.5 py-0.5 rounded-full text-[9px] font-bold truncate text-center ${getStatusColor(
                status,
              )}`}
            >
              {status}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5 flex-1 justify-start">
            <div className="flex items-center gap-1.5 min-w-[42px] justify-start shrink-0">
              {!!hasLoggedIn ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <User className="h-3.5 w-3.5 text-green-600 fill-green-600 shrink-0 cursor-default" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs font-semibold">
                        Client logged in
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <div className="w-3.5 h-3.5 shrink-0" />
              )}
              
              {!!hasOpenedQuotation ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Eye
                        className="h-3.5 w-3.5 text-blue-500 shrink-0 cursor-default"
                        strokeWidth={3}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs font-semibold">
                        Quotation viewed
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <div className="w-3.5 h-3.5 shrink-0" />
              )}
            </div>
            
            <div className="shrink-0 flex items-center ml-auto">
              <UnreadBadge
                inquiryId={inquiry.id}
                role="admin"
                senderId={inquiry.email}
                senderName={inquiry.name}
              />
            </div>
          </div>
        </div>
      );
    },
  },
  {
    id: "actions",
    header: () => <div className="text-center w-full">Actions</div>,
    size: 100, // Increased from 70 to provide more breathing room for buttons
    cell: ({ row }) => {
      const inquiry = row.original;
      const router = useRouter();
      const { adminInfo } = useAuth();
      const { canEdit, canCreate } = usePermissions(adminInfo?.role);

      return (
        <div className="flex items-center justify-center -space-x-1 h-9">
          {canCreate("quotations") && (
            <div className="scale-90 origin-center">
              <QuoteButton inquiryId={inquiry.id} />
            </div>
          )}

          {/* Edit inquiry modal trigger - only show if user has edit permission */}
          {canEdit("inquiries") && (
            <div className="scale-75 origin-center">
              <EditInquiryModal
                key={inquiry.id} // Force re-render when inquiry changes
                inquiry={inquiry}
                onSuccess={() => router.refresh()}
              />
            </div>
          )}
        </div>
      );
    },
  },
];
