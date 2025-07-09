// src/app/admin/quotations/QuotationClientTable.tsx
"use client"

import { useRouter } from "next/navigation"
import { QuotationRecord } from "@/types/Quotation"
import { columns } from "./columns"
import { DataTable } from "./data-table"

interface Props {
  data: QuotationRecord[]
}

export function QuotationClientTable({ data }: Props) {
  const router = useRouter()

  return (
    <DataTable
      columns={columns}
      data={data}
      onRowClick={(row) => {
        router.push(`/admin/quotations/${row.referenceNumber}`)
      }}
    />
  )
}