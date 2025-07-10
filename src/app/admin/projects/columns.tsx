"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Project } from "@/types/Project"
import { projectSchema } from "@/schemas/projectSchema"


export const columns: ColumnDef<Project>[] = [
  {
    accessorKey: "year",
    header: "Year",
  },
  {
    accessorKey: "startDate",
    header: "Start Date",
  },
  // {
  //   accessorKey: "endDate",
  //   header: "End Date",
  // },
  {
    accessorKey: "clientNames",
    header: "Client Names",
    cell: ({ row }) => {
      const names = row.original.clientNames;
      return names && names.length > 0 ? names.join(", ") : "";
    },
    //  enables global filtering by converting the array to a string
    filterFn: (row, columnId, filterValue) => {
      const value: string[] = row.getValue(columnId) || [];
      return value.join(", ").toLowerCase().includes(filterValue.toLowerCase());
    },
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
    accessorKey: "iid",
    header: "Inquiry ID",
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
    header: "Sending Institution",
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
    cell: ({ row }) => {
      const services = row.original.serviceRequested
      return services && services.length > 0 ? services.join(", ") : ""
    },
  },
  {
    accessorKey: "personnelAssigned",
    header: "Personnel Assigned",
  },
  {
    accessorKey: "notes",
    header: "Notes",
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const project = row.original;
      // Lazy import to avoid circular dependency if needed
      const EditProjectModal = require("@/components/forms/EditProjectModal").EditProjectModal;
      return <EditProjectModal project={project} onSuccess={() => {}} />;
    },
  },
]