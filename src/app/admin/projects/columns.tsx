// Admin Projects Table Columns
// Defines the columns and cell renderers for the admin projects data table.

"use client"

import { ColumnDef, Row } from "@tanstack/react-table"
import { Project } from "@/types/Project"
import { Button } from "@/components/ui/button"
import { ArrowUpDown } from "lucide-react"
import useAuth from "@/hooks/useAuth"
import { usePermissions } from "@/hooks/usePermissions"
import { EditProjectModal } from "@/components/forms/EditProjectModal"
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

// Proper React component for the actions cell so hooks are valid
function ActionCell({ row, meta }: { row: Row<Project>; meta: { onSuccess?: () => void } | undefined }) {
  const project = row.original;
  const { adminInfo } = useAuth();
  const { canEdit } = usePermissions(adminInfo?.role);

  if (!canEdit("projects")) {
    return null;
  }

  return (
    <div className="flex items-center justify-end px-1">
      <EditProjectModal project={project} onSuccess={meta?.onSuccess} />
    </div>
  );
}

// Column definitions for the projects table
export const columns: ColumnDef<Project>[] = [
  {
    accessorKey: "pid",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-accent px-1 text-[11px] font-semibold"
        >
          Project ID
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      )
    },
    size: 70,
    cell: ({ getValue }) => (
      <div className="font-mono text-[10px] text-muted-foreground px-1 truncate">
        {getValue() as string}
      </div>
    ),
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-accent px-1 text-[11px] font-semibold"
        >
          Date
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      )
    },
    size: 90,
    cell: ({ getValue }) => {
      const dateValue = getValue();
      if (!dateValue) return <div className="px-1 text-[10px] text-muted-foreground text-center">—</div>;
      
      try {
        const date = dateValue instanceof Date ? dateValue : (typeof dateValue === 'object' && 'toDate' in (dateValue as any) ? (dateValue as any).toDate() : new Date(dateValue as any));
        if (isNaN(date.getTime())) return <div className="px-1 text-[10px] text-muted-foreground text-center">—</div>;
        
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const yyyy = date.getFullYear();
        
        return (
          <div className="font-mono text-[10px] text-slate-500 px-1 text-center tabular-nums font-medium">
            {`${mm}-${dd}-${yyyy}`}
          </div>
        );
      } catch (e) {
        return <div className="px-1 text-[10px] text-muted-foreground text-center">—</div>;
      }
    },
  },
  {
    accessorKey: "title",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-accent px-1 text-[11px] font-semibold"
        >
          Project Title
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      )
    },
    size: 200,
    cell: ({ getValue }) => (
      <div className="max-w-[200px] text-[11px] font-medium truncate px-1 text-slate-900" title={getValue() as string}>
        {getValue() as string}
      </div>
    ),
  },
  {
    accessorKey: "clientNames",
    header: () => <div className="px-1 text-[12px] font-semibold">Clients</div>,
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
              <div className="flex items-center gap-0.5 max-w-[110px] cursor-help px-1 truncate">
                <span className="truncate text-[10px] text-slate-600">
                  {displayText}
                </span>
                {count > 0 && (
                  <span className="shrink-0 text-[11px] font-normal text-blue-600">
                    ({count})
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="p-3 bg-white border shadow-xl max-w-xs">
              <div className="space-y-1.5">
                <div className="text-[11px] font-normal text-gray-400 uppercase tracking-wider mb-2 border-b pb-1">
                  Project Members ({count})
                </div>
                <div className="flex flex-wrap gap-x-2 gap-y-1">
                  {names.map((name, idx) => (
                    <span 
                      key={idx} 
                      className={`text-[12px] font-normal ${CLIENT_COLORS[idx % CLIENT_COLORS.length]}`}
                    >
                      {name}{idx < names.length - 1 ? "," : ""}
                    </span>
                  ))}
                  {names.length === 0 && <span className="text-[12px] text-gray-500 italic">No clients assigned</span>}
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
    accessorKey: "status",
    header: () => <div className="px-1 text-[12px] font-semibold">Status</div>,
    size: 90,
    cell: ({ row }) => {
      // Render status with color-coded badge
      const status = row.original.status;
      let color = "bg-gray-100 text-gray-800";
      let label: string = status || "";
      switch (status) {
        case "Pending":
          color = "bg-blue-50 text-blue-700 border-blue-100";
          label = "Pending";
          break;
        case "Ongoing":
          color = "bg-amber-50 text-amber-700 border-amber-100";
          label = "Ongoing";
          break;
        case "Completed":
          color = "bg-emerald-50 text-emerald-700 border-emerald-100";
          label = "Completed";
          break;
        case "Cancelled":
          color = "bg-rose-50 text-rose-700 border-rose-100";
          label = "Cancelled";
          break;
        default:
          color = "bg-gray-50 text-gray-700 border-gray-100";
          label = status || "";
      }
      return (
        <div className="px-1 flex items-center h-full">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap ${color}`}>
            {label}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "sendingInstitution",
    header: () => <div className="px-1 text-[12px] font-semibold">Institution</div>,
    size: 110,
    cell: ({ row }) => {
      // Render sending institution with color-coded badge
      const value = row.original.sendingInstitution || "—";
      let color = "bg-gray-50 text-gray-700 border-gray-100";
      switch (value) {
        case "UP System": color = "bg-indigo-50 text-indigo-700 border-indigo-100"; break;
        case "SUC/HEI": color = "bg-emerald-50 text-emerald-700 border-emerald-100"; break;
        case "Government": color = "bg-amber-50 text-amber-700 border-amber-100"; break;
        case "Private/Local": color = "bg-violet-50 text-violet-700 border-violet-100"; break;
        case "International": color = "bg-rose-50 text-rose-700 border-rose-100"; break;
        case "N/A": color = "bg-slate-50 text-slate-500 border-slate-100"; break;
      }
      return (
        <div className="max-w-[110px] truncate px-1 flex items-center h-full" title={value}>
          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium border whitespace-nowrap ${color}`}>
            {value}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "startDate",
    header: () => <div className="px-1 text-[12px] font-semibold text-right">Start Date</div>,
    size: 85,
    cell: ({ getValue }) => (
      <div className="text-[10px] text-right text-slate-500 px-1 truncate">
        {getValue() as string || "—"}
      </div>
    ),
  },
  {
    id: "actions",
    header: () => <div className="px-1 text-[11px] font-semibold text-right">Actions</div>,
    size: 60,
    cell: ({ row, table }) => (
      <ActionCell row={row} meta={(table.options.meta as { onSuccess?: () => void }) ?? undefined} />
    ),
  },
]
