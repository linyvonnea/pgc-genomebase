"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Inquiry } from "@/types/Inquiry"
import { inquirySchema } from "@/schemas/inquirySchema"

// Utility function to validate inquiry data using Zod schema
const validateInquiry = (data: any) => {
  const result = inquirySchema.safeParse(data)
  return {
    isValid: result.success,
    data: result.success ? result.data : null,
    error: result.success ? null : result.error
  }
}

export const columns: ColumnDef<Inquiry>[] = [
  {
    accessorKey: "id",
    header: "ID",
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
    accessorKey: "isApproved",
    header: "Status",
    cell: ({ row }) => {
      const { isValid, data } = validateInquiry(row.original)
      
      if (!isValid || !data) {
        return <span className="text-red-500">Invalid data</span>
      }
      
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          data.isApproved 
            ? 'bg-green-100 text-green-800' 
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {data.isApproved ? 'Approved' : 'Pending'}
        </span>
      )
    },
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => {
      const { isValid, data } = validateInquiry(row.original)
      
      if (!isValid || !data) {
        return <span className="text-red-500">Invalid date</span>
      }
      
      return data.createdAt.toLocaleDateString()
    },
  },
  {
    accessorKey: "year",
    header: "Year",
  },
]