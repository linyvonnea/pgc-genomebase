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
import { inquirySchema } from "@/schemas/inquirySchema";
import { Button } from "@/components/ui/button";
import { EditInquiryModal } from "@/components/forms/EditInquiryModal";
import useAuth from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";

/**
 * Utility function to validate inquiry data using Zod schema
 * 
 * This function ensures that the inquiry data conforms to the expected structure
 * before rendering. 
 */
const validateInquiry = (data: any) => {
  const result = inquirySchema.safeParse(data);
  return {
    isValid: result.success,
    data: result.success ? result.data : null,
    error: result.success ? null : result.error,
  };
};

/**
 * Utility function to get appropriate CSS classes for status badges
 * 
 * Provides consistent color coding across the admin interface:
 * - Green: Approved clients (ready for service)
 * - Blue: Quotation only (pricing information provided)
 * - Yellow: Pending (awaiting admin review)
 * 
 */
const getStatusColor = (status: string) => {
  switch (status) {
    case "Approved Client":
      return "bg-green-100 text-green-800"; 
    case "Quotation Only":
      return "bg-blue-100 text-blue-800";   
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
    size: 120,
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    size: 100,
    cell: ({ row }) => {
      // Custom date formatting with validation
      const { isValid, data } = validateInquiry(row.original);
      
      if (!isValid || !data) {
        return <span className="text-red-500">Invalid date</span>;
      }
      // Format date for display (YYYY-MM-DD format for consistency)
      return new Date(data.createdAt).toLocaleDateString("en-CA");
    },
  },
  {
    accessorKey: "name",
    header: "Name",
    size: 180,
    cell: ({ getValue }) => {
      const name = getValue() as string;
      return (
        <div className="max-w-[180px] truncate" title={name}>
          {name}
        </div>
      );
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    size: 200,
    cell: ({ getValue }) => {
      const email = getValue() as string || "—";
      return (
        <div className="max-w-[200px] truncate" title={email}>
          {email}
        </div>
      );
    },
  },
  {
    accessorKey: "affiliation",
    header: "Affiliation",
    size: 220,
    cell: ({ getValue }) => {
      const affiliation = getValue() as string;
      return (
        <div className="max-w-[220px] truncate" title={affiliation}>
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
    size: 120, 
    cell: ({ row }) => {
      // Custom cell renderer with data validation
      const { isValid, data } = validateInquiry(row.original);

      if (!isValid || !data) {
        return <span className="text-red-500">Invalid data</span>;
      }

      // Render status as a colored badge
      return (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(
            data.status
          )}`}
        >
          {data.status}
        </span>
      );
    },
  },
  {
    id: "actions", // Custom column ID since it doesn't map to data
    header: "Actions",
    size: 250,
    cell: ({ row }) => {
      const inquiry = row.original;
      const router = useRouter();
      const { adminInfo } = useAuth();
      const { canEdit, canCreate, canView } = usePermissions(adminInfo?.role);

      return (
        <div className="flex items-center gap-2">
          {canCreate("quotations") && (
            <Button
              onClick={() =>
                router.push(`/admin/quotations/new?inquiryId=${inquiry.id}`)
              }
              variant="default"
              size="sm"
              className="whitespace-nowrap"
            >
              Quote
            </Button>
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