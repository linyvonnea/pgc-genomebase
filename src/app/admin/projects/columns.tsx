// Admin Projects Table Columns
// Defines the columns and cell renderers for the admin projects data table.

"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Project } from "@/types/Project"
import { projectSchema } from "@/schemas/projectSchema"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import useAuth from "@/hooks/useAuth"
import { usePermissions } from "@/hooks/usePermissions"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Professional colors for client names in tooltip
const CLIENT_COLORS = [
  "text-blue-600",
  "text-emerald-600",
  "text-violet-600",
  "text-amber-600",
  "text-rose-600",
  "text-indigo-600",
  "text-cyan-600",
];

// Column definitions for the projects table
export const columns: ColumnDef<Project>[] = [
  {
    accessorKey: "pid",
    header: "Project ID",
    size: 90,
  },
  {
    accessorKey: "title",
    header: "Project Title",
    size: 200,
    cell: ({ getValue }) => (
      <div className="max-w-[200px] truncate" title={getValue() as string}>
        {getValue() as string}
      </div>
    ),
  },
  {
    accessorKey: "clientNames",
    header: "Client Names",
    size: 130,
    cell: ({ row }) => {
      // Render client names as comma-separated string with truncation and count
      const names = row.original.clientNames || [];
      const displayText = names.length > 0 ? names.join(", ") : "—";
      const count = names.length;
      
      return (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-0.5 max-w-[130px] cursor-help">
                <span className="truncate" title="">
                  {displayText}
                </span>
                {count > 0 && (
                  <span className="shrink-0 text-xs font-bold text-blue-600">
                    ({count})
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="p-3 bg-white border shadow-xl max-w-xs">
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 border-b pb-1">
                  Project Members ({count})
                </div>
                <div className="flex flex-wrap gap-x-2 gap-y-1">
                  {names.map((name, idx) => (
                    <span 
                      key={idx} 
                      className={`text-sm font-semibold ${CLIENT_COLORS[idx % CLIENT_COLORS.length]}`}
                    >
                      {name}{idx < names.length - 1 ? "," : ""}
                    </span>
                  ))}
                  {names.length === 0 && <span className="text-sm text-gray-500 italic">No clients assigned</span>}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
    size: 110,
    cell: ({ getValue }) => {
      const lead = getValue() as string || "—";
      return (
        <div className="max-w-[110px] truncate text-left" title={lead}>
          {lead}
        </div>
      );
    },
  },
  {
    accessorKey: "personnelAssigned",
    header: "Personnel",
    size: 130,
    cell: ({ getValue }) => {
      const personnel = getValue() as string || "—";
      return (
        <div className="max-w-[130px] truncate text-left" title={personnel}>
          {personnel}
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    size: 90,
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
    header: "Institution",
    size: 120,
    cell: ({ row }) => {
      // Render sending institution with color-coded badge
      const value = row.original.sendingInstitution || "—";
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
        <div className="max-w-[120px] truncate" title={value}>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${color}`}>
            {value}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "startDate",
    header: "Start Date",
    size: 90,
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
  //   accessorKey: "notes",
  //   header: "Notes",
  // },
  // },
  {
    id: "actions",
    header: "Actions",
    size: 80,
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
