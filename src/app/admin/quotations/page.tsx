// src/app/admin/quotations/page.tsx
import { QuotationRecord } from "@/types/Quotation"
import { getAllQuotations } from "@/services/quotationService"
import { QuotationClientTable } from "./QuotationClientTable"

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getData(): Promise<QuotationRecord[]> {
  try {
    return await getAllQuotations()
  } catch (error) {
    console.error("Failed to fetch quotations:", error)
    return []
  }
}

export default async function QuotationPage() {
  const data = await getData()

  return (
    <div className="container mx-auto py-4 space-y-3">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Quotation Management</h1>
        <p className="text-sm text-muted-foreground">
          Review and manage all quotations prepared through GenomeBase.
        </p>
      </div>

      <QuotationClientTable data={data} />
    </div>
  )
}