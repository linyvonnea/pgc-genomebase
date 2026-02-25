// Admin Clients Table Columns
// Defines the columns and actions for the admin/clients data table.

"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Client } from "@/types/Client"
import { clientSchema } from "@/schemas/clientSchema"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { toast } from "sonner";
import { ArrowUpDown } from "lucide-react"
import useAuth from "@/hooks/useAuth"
import { usePermissions } from "@/hooks/usePermissions"

// Helper to validate client data using Zod schema
const validateClient = (data: any) => {
  const result = clientSchema.safeParse(data)
  return {
    isValid: result.success,
    data: result.success ? result.data : null,
    error: result.success ? null : result.error
  }
}

// Table columns definition for admin/clients
export const columns: ColumnDef<Client>[] = [

  { 
    accessorKey: "cid",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-accent px-2 text-xs"
        >
          Client ID
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      )
    },
    size: 100,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-accent px-2 text-xs"
        >
          Date
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      )
    },
    size: 90,
    cell: ({ getValue }) => {
      const val = getValue() as string | number | Date | undefined;
      if (!val) return "-";
      const date = new Date(val);
      return isNaN(date.getTime()) ? "-" : (
        <span className="text-[11px] whitespace-nowrap">
          {date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      );
    },
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-accent px-2 text-xs"
        >
          Client Name
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      )
    },
    size: 180,
    cell: ({ getValue }) => (
      <div className="max-w-[180px] text-xs font-medium whitespace-normal break-words leading-tight">
        {getValue() as string}
      </div>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    size: 160,
    cell: ({ getValue }) => (
      <div className="max-w-[160px] truncate text-[11px] text-muted-foreground" title={getValue() as string}>
        {getValue() as string}
      </div>
    ),
  },
  {
    accessorKey: "pid",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-accent px-2 text-xs"
        >
          Projects
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      )
    },
    size: 120,
    cell: ({ row }) => {
      // pid is now an array
      const projects = Array.isArray(row.original.pid) 
        ? row.original.pid 
        : (row.original.pid ? [row.original.pid] : []);
      
      if (projects.length === 0) return <span className="text-gray-400 text-[10px]">-</span>;
      
      if (projects.length === 1) {
        return (
          <div className="px-1.5 py-0.5 bg-blue-50 border border-blue-100 rounded text-[9px] font-mono font-bold text-[#166FB5] w-fit">
            {projects[0]}
          </div>
        );
      }

      const firstPid = projects[0];
      const otherPids = projects.slice(1).join(", ");
      
      return (
        <div className="flex items-center gap-1">
          <div className="px-1.5 py-0.5 bg-blue-50 border border-blue-100 rounded text-[9px] font-mono font-bold text-[#166FB5]">
            {firstPid}
          </div>
          <div 
            className="px-1 py-0.5 bg-gray-50 border border-gray-200 rounded text-[9px] font-mono font-bold text-gray-500 cursor-help"
            title={otherPids}
          >
            +{projects.length - 1}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "affiliation",
    header: "Affiliation",
    size: 150,
    cell: ({ getValue }) => (
      <div className="max-w-[150px] line-clamp-1 text-[11px] leading-tight" title={getValue() as string}>
        {getValue() as string}
      </div>
    ),
  },
  {
    accessorKey: "designation",
    header: "Designation",
    size: 110,
    cell: ({ getValue }) => (
      <div className="max-w-[110px] truncate text-[11px]" title={getValue() as string}>
        {getValue() as string}
      </div>
    ),
  },
  {
    accessorKey: "phoneNumber",
    header: "Phone",
    size: 100,
    cell: ({ getValue }) => (
      <div className="text-[11px] whitespace-nowrap">
        {getValue() as string}
      </div>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    size: 130,
    cell: (ctx: any) => {
      const { row, meta } = ctx;
      const client = row.original;
      const EditClientModal = require("@/components/forms/EditClientModal").EditClientModal;
      const router = useRouter();
      const { adminInfo } = useAuth();
      const { canEdit, canCreate } = usePermissions(adminInfo?.role);

      return (
        <div className="flex items-center gap-1.5 justify-end">
          {canEdit("clients") && (
            <EditClientModal client={client} onSuccess={meta?.onSuccess} />
          )}
          {canCreate("chargeSlips") && (
            <Button
              onClick={() => {
                const primaryPid = Array.isArray(client.pid) ? client.pid[0] : client.pid;
                if (!client.cid || !primaryPid) return;
                router.push(`/admin/charge-slips/new?clientId=${encodeURIComponent(client.cid)}&projectId=${encodeURIComponent(primaryPid)}`);
              }}
              variant="outline"
              size="sm"
              className="h-7 text-[10px] px-2 py-0"
            >
              Slip
            </Button>
          )}
        </div>
      );
    },
  },
]