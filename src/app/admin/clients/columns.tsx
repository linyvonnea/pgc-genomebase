// Admin Clients Table Columns
// Defines the columns and actions for the admin/clients data table.

"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Client } from "@/types/Client"
import { clientSchema } from "@/schemas/clientSchema"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation";

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
    header: "Client ID",
  },
  {
    accessorKey: "name",
    header: "Client Name",
  },
  {
    accessorKey: "pid",
    header: "Project ID",
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
    accessorKey: "affiliationAddress",
    header: "Affiliation Address",
  },
  {
    accessorKey: "designation",
    header: "Designation",
  },
  {
    accessorKey: "sex",
    header: "Sex",
  },
  {
    accessorKey: "phoneNumber",
    header: "Phone Number",
  },
  {
    id: "actions",
    header: "Actions",
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
            className="text-sm"
          >
            Charge Slip
          </Button>
        </div>
      );
    },
  },
]