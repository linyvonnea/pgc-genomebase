// Admin Clients Table Columns
// Defines the columns and actions for the admin/clients data table.

"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Client } from "@/types/Client"
import { clientSchema } from "@/schemas/clientSchema"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { ArrowUpDown } from "lucide-react";

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
    header: "Primary Project",
    size: 120,
  },
  {
    accessorKey: "projects",
    header: "All Projects",
    size: 200,
    cell: ({ row }) => {
      const primaryProject = row.original.pid;
      const additionalProjects = row.original.projects || [];
      const allProjects = primaryProject 
        ? [primaryProject, ...additionalProjects.filter(p => p !== primaryProject)]
        : additionalProjects;
      
      if (allProjects.length === 0) return <span className="text-gray-400">-</span>;
      
      return (
        <div className="max-w-[200px]">
          <div className="flex flex-wrap gap-1">
            {allProjects.slice(0, 2).map((proj, idx) => (
              <span
                key={proj}
                className={`text-xs px-2 py-0.5 rounded ${
                  idx === 0 && primaryProject === proj
                    ? "bg-blue-100 text-blue-700 font-medium"
                    : "bg-gray-100 text-gray-700"
                }`}
                title={proj}
              >
                {proj}
              </span>
            ))}
            {allProjects.length > 2 && (
              <span className="text-xs text-gray-500">+{allProjects.length - 2}</span>
            )}
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
      return (
        <div className="flex items-center gap-2">
          {/* Edit client modal button */}
          <EditClientModal client={client} onSuccess={meta?.onSuccess} />
          {/* Charge slip button */}
          <Button
            onClick={() => {
              router.push(
                `/admin/charge-slips/new?clientId=${client.cid}&projectId=${client.pid}`
              );
            }}
            variant="outline"
            size="sm"
            className="whitespace-nowrap"
          >
            Charge Slip
          </Button>
        </div>
      );
    },
  },
]