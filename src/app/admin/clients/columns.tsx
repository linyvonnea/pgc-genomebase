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
          className="hover:bg-accent"
        >
          Client ID
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    size: 120,
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-accent"
        >
          Client Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    size: 250,
    cell: ({ getValue }) => (
      <div className="max-w-[250px] whitespace-normal break-words">
        {getValue() as string}
      </div>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    size: 220,
    cell: ({ getValue }) => (
      <div className="max-w-[220px] truncate" title={getValue() as string}>
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
          className="hover:bg-accent"
        >
          Projects
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    size: 180,
    cell: ({ row }) => {
      // pid is now an array
      const projects = Array.isArray(row.original.pid) 
        ? row.original.pid 
        : (row.original.pid ? [row.original.pid] : []);
      
      if (projects.length === 0) return <span className="text-gray-400 text-sm">-</span>;
      
      if (projects.length === 1) {
        return (
          <div className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-[10px] font-mono font-bold text-[#166FB5] w-fit">
            {projects[0]}
          </div>
        );
      }

      const firstPid = projects[0];
      const otherPids = projects.slice(1).join(", ");
      
      return (
        <div className="flex items-center gap-1">
          <div className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-[10px] font-mono font-bold text-[#166FB5]">
            {firstPid}
          </div>
          <div 
            className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px] font-mono font-bold text-gray-600 cursor-help"
            title={otherPids}
          >
            ...
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "affiliation",
    header: "Affiliation",
    size: 200,
    cell: ({ getValue }) => (
      <div className="max-w-[200px] line-clamp-2" title={getValue() as string}>
        {getValue() as string}
      </div>
    ),
  },
  {
    accessorKey: "affiliationAddress",
    header: "Affiliation Address",
    size: 180,
    cell: ({ getValue }) => (
      <div className="max-w-[180px] line-clamp-2" title={getValue() as string}>
        {getValue() as string || "-"}
      </div>
    ),
  },
  {
    accessorKey: "designation",
    header: "Designation",
    size: 150,
  },
  // Sex - Hidden for cleaner view
  // {
  //   accessorKey: "sex",
  //   header: "Sex",
  // },
  {
    accessorKey: "phoneNumber",
    header: "Phone",
    size: 130,
  },
  {
    id: "actions",
    header: "Actions",
    size: 200,
    // Render edit modal and charge slip button for each row
    cell: (ctx: any) => {
      const { row, meta } = ctx;
      const client = row.original;
      // Lazy load EditClientModal to avoid SSR issues
      const EditClientModal = require("@/components/forms/EditClientModal").EditClientModal;
      const router = useRouter();
      const { adminInfo } = useAuth();
      const { canEdit, canCreate } = usePermissions(adminInfo?.role);

      return (
        <div className="flex items-center gap-2">
          {/* Edit client modal button - only show if user has edit permission */}
          {canEdit("clients") && (
            <EditClientModal client={client} onSuccess={meta?.onSuccess} />
          )}
          {/* Charge slip button - only show if user can create charge slips */}
          {canCreate("chargeSlips") && (
            <Button
              onClick={() => {
                // Use primary project ID (first in array)
                const primaryPid = Array.isArray(client.pid) ? client.pid[0] : client.pid;
                if (!client.cid) {
                  toast.error("Client ID missing for this record");
                  return;
                }
                if (!primaryPid) {
                  toast.error("No project associated with this client");
                  return;
                }
                try {
                  router.push(
                    `/admin/charge-slips/new?clientId=${encodeURIComponent(client.cid)}&projectId=${encodeURIComponent(primaryPid)}`
                  );
                } catch (err) {
                  console.error('Navigation error to charge slip builder', err);
                  toast.error('Failed to open charge slip builder');
                }
              }}
              variant="outline"
              size="sm"
              className="whitespace-nowrap"
            >
              Charge Slip
            </Button>
          )}
        </div>
      );
    },
  },
]