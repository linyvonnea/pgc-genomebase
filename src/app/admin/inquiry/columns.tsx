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
import { QuoteButton } from "./QuoteButton";
import { Copy } from "lucide-react";
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
        const date = inquiry.createdAt instanceof Date ? inquiry.createdAt : new Date(inquiry.createdAt);
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
        return date >= oneDayAgo;
      })();
      
      // NEW badge logic:
      // 1. Show if status is "Pending" (regardless of time)
      // 2. Show if it's very recent (last 24h) EXCEPT if it's already quoted
      const isQuoted = ["Ongoing Quotation", "Approved Client", "Quotation Only"].includes(inquiry.status);
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
            <Badge variant="destructive" className="h-4 px-1 text-[8px] animate-pulse shrink-0">NEW</Badge>
          )}
          <span className="font-mono text-xs truncate" title={inquiry.id}>{inquiry.id}</span>
          <button
            onClick={handleCopy}
            className="p-1 hover:bg-slate-100 rounded shrink-0"
            title="Copy Inquiry ID"
          >
            <Copy className="h-3 w-3 text-slate-500" />
          </button>
        </div>
      );
    }
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    size: 85,
    cell: ({ row }) => {
      const createdAt = row.original.createdAt;
      
      if (!createdAt) {
        return <span className="text-muted-foreground italic">—</span>;
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
      const email = getValue() as string || "—";
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
    size: 100, 
    cell: ({ row }) => {
      const status = row.original.status || "Pending";

      // Render status as a colored badge
      return (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(
            status
          )}`}
        >
          {status}
        </span>
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
          {canCreate("quotations") && (
            <QuoteButton 
              inquiryId={inquiry.id} 
              hasSeen={inquiry.hasOpenedQuotation} 
              hasLoggedIn={inquiry.hasLoggedIn}
            />
          )}

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