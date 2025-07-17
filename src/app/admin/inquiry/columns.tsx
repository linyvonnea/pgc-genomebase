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
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "affiliation",
    header: "Affiliation",
  },
  {
    accessorKey: "designation",
    header: "Designation",
  },
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
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => {
      // Custom date formatting with validation
      const { isValid, data } = validateInquiry(row.original);
      
      if (!isValid || !data) {
        return <span className="text-red-500">Invalid date</span>;
      }
      // Format date for display (MM/DD/YYYY format)
      return new Date(data.createdAt).toLocaleDateString();
    },
  },
  {
    id: "actions", // Custom column ID since it doesn't map to data
    header: "Actions",
    cell: ({ row }) => {
      const inquiry = row.original;
      const router = useRouter();

      return (
        <div className="flex items-center gap-2">
          {/* Edit inquiry modal trigger */}
          <EditInquiryModal
            key={inquiry.id} // Force re-render when inquiry changes
            inquiry={inquiry}
            onSuccess={() => router.refresh()}
          />
          
          {/* Generate quotation button */}
          <Button
            onClick={() =>
              router.push(`/admin/quotations/new?inquiryId=${inquiry.id}`)
            }
            variant="outline"
            className="text-sm"
          >
            Quote
          </Button>
        </div>
      );
    },
  },
];