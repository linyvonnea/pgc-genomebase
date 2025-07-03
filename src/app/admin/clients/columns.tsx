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
    accessorKey: "id",
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
    accessorKey: "institution",
    header: "Insitution",
  },
  {
    accessorKey: "institutionAddress",
    header: "Insitution Address",
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
    accessorKey: "mobileNumber",
    header: "Mobile Number",
  },
]