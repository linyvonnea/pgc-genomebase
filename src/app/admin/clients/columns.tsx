"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Client } from "@/types/Client"
import { clientSchema } from "@/schemas/clientSchema"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation";

const validateClient = (data: any) => {
  const result = clientSchema.safeParse(data)
  return {
    isValid: result.success,
    data: result.success ? result.data : null,
    error: result.success ? null : result.error
  }
}

export const columns: ColumnDef<Client>[] = [
  {
    accessorKey: "pid",
    header: "Project ID",
  },
  { 
    accessorKey: "cid",
    header: "Client ID",
  },
  {
    accessorKey: "name",
    header: "Client Name",
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
    cell: ({ row }) => {
      const client = row.original;
      const router = useRouter();
      // Lazy import to avoid circular dependency if needed
      const EditClientModal = require("@/components/forms/EditClientModal").EditClientModal;
      return (
      <div className="flex items-center gap-2">
      <EditClientModal client={client} onSuccess={() => {}} />
        <Button
          onClick={() => {
            console.log("Client Data:", client);
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