// Admin Projects Table Columns
// Defines the columns and cell renderers for the admin projects data table.

"use client"

import { ColumnDef } from "@/tanstack/react-table"
import { Project } from "@/types/Project"
import { projectSchema } from "@/schemas/projectSchema"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import useAuth from "@/hooks/useAuth"
import { usePermissions } from "@/hooks/usePermissions"

// Column definitions for the projects table
export const columns: ColumnDef<Project>[] = [
  {
    accessorKey: "pid",
    header: "Project ID",
    size: 120,
  },
  {
    accessorKey: "title",
    header: "Project Title",
    size: 300,
    cell: ({ getValue }) => (
      <div className="max-w-[300px] truncate" title={getValue() as string}>
        {getValue() as string}
      </div>
    ),
  },
  {
    accessorKey: "clientNames",
    header: "Client Names",
    size: 200,
    cell: ({ row }) => {
      // Render client names as comma-separated string with truncation
      const names = row.original.clientNames;
      const displayText = names && names.length > 0 ? names.join(", ") : "";
      return (
        <div className="max-w-[200px] truncate" title={displayText}>
          {displayText}
        </div>
      );
    },
    // Enables global filtering by converting the array to a string
    filterFn: (row, columnId, filterValue) => {
      const value: string[] = row.getValue(columnId) || [];
      return value.join(", ").toLowerCase().includes(filterValue.toLowerCase());
    },
  },
  {
    accessorKey: "lead",
    header: "Project Lead",
    size: 150,
  },
  {
    accessorKey: "status",
    header: "Status",
    size: 110,
    cell: ({ row }) => {
      // Render status with color-coded badge
      const status = row.original.status;
      let color = "bg-gray-100 text-gray-800";
      let label: string = status || "";
      switch (status) {
        case "Ongoing":
          color = "bg-yellow-100 text-yellow-800";
          label = "Ongoing";
          break;
        case "Completed":
          color = "bg-green-100 text-green-800";
          label = "Completed";
          break;
        case "Cancelled":
          color = "bg-red-100 text-red-800";
          label = "Cancelled";
          break;
        default:
          color = "bg-gray-100 text-gray-800";
          label = status || "";
      }
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${color}`}>
          {label}
        </span>
      );
    },
  },
  {
    accessorKey: "sendingInstitution",
    header: "Sending Institution",
    size: 160,
    cell: ({ row }) => {
      // Render sending institution with color-coded badge
      const value = row.original.sendingInstitution;
      let color = "bg-gray-100 text-gray-800";
      switch (value) {
        case "UP System": color = "bg-blue-100 text-blue-800"; break;
        case "SUC/HEI": color = "bg-green-100 text-green-800"; break;
        case "Government": color = "bg-yellow-100 text-yellow-800"; break;
        case "Private/Local": color = "bg-purple-100 text-purple-800"; break;
        case "International": color = "bg-pink-100 text-pink-800"; break;
        case "N/A": color = "bg-gray-200 text-gray-600"; break;
      }
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${color}`}>
          {value}
        </span>
      );
    },
  },
  {
    accessorKey: "startDate",
    header: "Start Date",
    size: 110,
  },
  // Hidden columns - Access via Edit Modal
  // {
  //   accessorKey: "iid",
  //   header: "Inquiry ID",
  // },
  // {
  //   accessorKey: "projectTag",
  //   header: "Project Tag",
  // },
  // {
  //   accessorKey: "fundingCategory",
  //   header: "Funding Category",
  // },
  // {
  //   accessorKey: "fundingInstitution",
  //   header: "Source of Funding",
  // },
  // {
  //   accessorKey: "serviceRequested",
  //   header: "Service Requested",
  // },
  // {
  //   accessorKey: "personnelAssigned",
  //   header: "Personnel Assigned",
  // },
  // {
  //   accessorKey: "notes",
  //   header: "Notes",
  // },
  // },
  {
    id: "actions",
    header: "Actions",
    size: 120,
    cell: (ctx: any) => {
      // Render edit modal for each project row
      const { row, meta } = ctx;
      const project = row.original;
      const EditProjectModal = require("@/components/forms/EditProjectModal").EditProjectModal;
      const router = useRouter();
      const { adminInfo } = useAuth();
      const { canEdit } = usePermissions(adminInfo?.role);

      // Only show edit button if user has edit permission
      if (!canEdit("projects")) {
        return null;
      }

      return (
        <div className="flex items-center gap-2">
          <EditProjectModal project={project} onSuccess={meta?.onSuccess} />
        </div>
      );
    },
  },
]
