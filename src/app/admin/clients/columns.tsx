"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Client } from "@/types/Client"
import { clientSchema } from "@/schemas/clientSchema"

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
 
]