// src/app/admin/quotations/page.tsx
import { QuotationRecord } from "@/types/Quotation"
import { getAllQuotations } from "@/services/quotationService"
import { QuotationClientTable } from "./QuotationClientTable" // ✅ your new wrapper

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

  const countByCategory = (category: string) =>
    data.filter((q) =>
        q.categories.some((c) => c.toLowerCase() === category.toLowerCase())
    ).length;

  const lab = countByCategory("Laboratory")
  const equip = countByCategory("Equipment")
  const bioinfo = countByCategory("Bioinformatics")
  const retail = countByCategory("Retail")
  const total = data.length

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Quotation Management</h1>
        <p className="text-muted-foreground">
          Review and manage all quotations prepared through GenomeBase.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="rounded-lg border p-4">
          <div className="text-2xl font-bold text-green-600">{lab}</div>
          <div className="text-sm text-muted-foreground">Laboratory</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-2xl font-bold text-blue-600">{equip}</div>
          <div className="text-sm text-muted-foreground">Equipment</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-2xl font-bold text-purple-600">{bioinfo}</div>
          <div className="text-sm text-muted-foreground">Bioinformatics</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-2xl font-bold text-orange-600">{retail}</div>
          <div className="text-sm text-muted-foreground">Retail Sales</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-2xl font-bold text-gray-700">{total}</div>
          <div className="text-sm text-muted-foreground">Total Quotations</div>
        </div>
      </div>
      <QuotationClientTable data={data} />
    </div>
  )
}
