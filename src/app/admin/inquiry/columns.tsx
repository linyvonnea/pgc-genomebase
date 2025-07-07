"use client";

import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { Inquiry } from "@/types/Inquiry";
import { inquirySchema } from "@/schemas/inquirySchema";
import { Button } from "@/components/ui/button";

// Utility function to validate inquiry data using Zod
const validateInquiry = (data: any) => {
  const result = inquirySchema.safeParse(data);
  return {
    isValid: result.success,
    data: result.success ? result.data : null,
    error: result.success ? null : result.error,
  };
};

// Utility function to get status color
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
      const { isValid, data } = validateInquiry(row.original);
      if (!isValid || !data) {
        return <span className="text-red-500">Invalid data</span>;
      }

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
      const { isValid, data } = validateInquiry(row.original);
      if (!isValid || !data) {
        return <span className="text-red-500">Invalid date</span>;
      }

      return new Date(data.createdAt).toLocaleDateString();
    },
  },
  {
    accessorKey: "year",
    header: "Year",
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const inquiry = row.original;
      const router = useRouter();

      return (
        <Button
          onClick={() =>
            router.push(`/admin/quotations/new?inquiryId=${inquiry.id}`)
          }
          variant="outline"
          className="text-sm"
        >
          Quote
        </Button>
      );
    },
  },
];