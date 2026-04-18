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
import { ChargeSlipButton } from "./ChargeSlipButton"
import { EditClientModal } from "@/components/forms/EditClientModal"

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
          className="hover:bg-accent px-1 text-[11px] font-semibold"
        >
          Client ID
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      )
    },
    size: 70,
    cell: ({ getValue }) => (
      <div className="font-mono text-[10px] text-muted-foreground px-1">
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
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-accent px-1 text-[11px] font-semibold"
        >
          Client Name
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      )
    },
    size: 160,
    cell: ({ getValue }) => (
      <div className="max-w-[160px] text-[11px] font-medium whitespace-normal break-words leading-tight px-1 text-slate-900">
        {getValue() as string}
      </div>
    ),
  },
  {
    accessorKey: "email",
    header: () => <div className="px-1 text-[11px] font-semibold">Email</div>,
    size: 140,
    cell: ({ getValue }) => (
      <div className="max-w-[140px] truncate text-[10px] text-slate-500 px-1" title={getValue() as string}>
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
          className="hover:bg-accent px-1 text-[11px] font-semibold"
        >
          Projects
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      )
    },
    size: 100,
    cell: ({ row }) => {
      // pid is now an array
      const projects = Array.isArray(row.original.pid) 
        ? row.original.pid 
        : (row.original.pid ? [row.original.pid] : []);
      
      if (projects.length === 0) return <span className="text-gray-400 text-[10px] px-1">-</span>;
      
      if (projects.length === 1) {
        return (
          <div className="px-1.5 py-0.5 bg-blue-50 border border-blue-100 rounded text-[9px] font-mono font-bold text-[#166FB5] w-fit ml-1">
            {projects[0]}
          </div>
        );
      }

      const firstPid = projects[0];
      const otherPids = projects.slice(1).join(", ");
      
      return (
        <div className="flex items-center gap-1 ml-1">
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
    header: () => <div className="px-1 text-[11px] font-semibold">Affiliation</div>,
    size: 140,
    cell: ({ getValue }) => (
      <div className="max-w-[140px] line-clamp-1 text-[10px] leading-tight text-slate-600 px-1" title={getValue() as string}>
        {getValue() as string}
      </div>
    ),
  },
  {
    accessorKey: "designation",
    header: () => <div className="px-1 text-[11px] font-semibold">Designation</div>,
    size: 100,
    cell: ({ getValue }) => (
      <div className="max-w-[100px] truncate text-[10px] text-slate-500 px-1" title={getValue() as string}>
        {getValue() as string}
      </div>
    ),
  },
  {
    accessorKey: "phoneNumber",
    header: () => <div className="px-1 text-[11px] font-semibold text-right">Phone</div>,
    size: 90,
    cell: ({ getValue }) => (
      <div className="text-[10px] whitespace-nowrap text-right text-slate-500 px-1">
        {getValue() as string}
      </div>
    ),
  },
  {
    id: "actions",
    header: () => <div className="px-1 text-[11px] font-semibold text-right">Actions</div>,
    size: 150,
    cell: (ctx: any) => {
      const { row, meta } = ctx;
      const client = row.original;
      const router = useRouter();
      const { adminInfo } = useAuth();
      const { canEdit, canCreate } = usePermissions(adminInfo?.role);

      return (
        <div className="flex items-center gap-1 justify-end px-1">
          {canEdit("clients") && (
            <EditClientModal client={client} onSuccess={meta?.onSuccess} />
          )}
          {canCreate("chargeSlips") && (
            <Button
              onClick={(event) => {
                event.stopPropagation();
                const primaryPid = Array.isArray(client.pid) ? client.pid[0] : client.pid;
                if (!client.cid || !primaryPid) return;
                router.push(`/admin/charge-slips/new?clientId=${encodeURIComponent(client.cid)}&projectId=${encodeURIComponent(primaryPid)}`);
              }}
              variant="outline"
              size="sm"
              className="h-7 text-[9px] px-2 py-0 border-blue-200 text-blue-700 hover:bg-blue-50 font-semibold"
              data-stop-row-click="true"
            >
              Charge Slip
            </Button>
          )}
        </div>
      );
    },
  },
]