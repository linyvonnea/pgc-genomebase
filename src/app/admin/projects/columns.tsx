"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Project } from "@/types/Project"
import { projectSchema } from "@/schemas/projectSchema"

const validateProject = (data: any) => {
  const result = projectSchema.safeParse(data)
  return {
    isValid: result.success,
    data: result.success ? result.data : null,
    error: result.success ? null : result.error
  }
}

export const columns: ColumnDef<Project>[] = [
  {
    accessorKey: "year",
    header: "Year",
  },
  {
    accessorKey: "startDate",
    header: "Start Date",
  },
  {
    accessorKey: "endDate",
    header: "End Date",
  },
  {
    accessorKey: "clientNames",
    header: "Client Names",
  },
  {
    accessorKey: "lead",
    header: "Project Lead",
  },
  {
    accessorKey: "pid",
    header: "Project ID",
  },
  {
    accessorKey: "title",
    header: "Project Title",
  },
  {
    accessorKey: "projectTag",
    header: "Project Tag",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          status === 'Ongoing'
            ? 'bg-yellow-100 text-yellow-800'
            : status === 'Completed'
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {status}
        </span>
      );
    },
  },
  {
    accessorKey: "sendingInstitution",
    header: "Sending lInstitution",
  },
  {
    accessorKey: "fundingCategory",
    header: "Funding Category",
  },
  {
    accessorKey: "fundingInstitution",
    header: "Funding Institution",
  },
  {
    accessorKey: "serviceRequested",
    header: "Service Requested",
  },
  {
    accessorKey: "personnelAssigned",
    header: "Personnel Assigned",
  },
  {
    accessorKey: "notes",
    header: "Notes",
  },



 
]