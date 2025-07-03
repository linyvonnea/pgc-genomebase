import { columns } from "./columns"
import { DataTable } from "./data-table"
import { Client } from "@/types/Client"
import { mockClients } from "@/mock/mockClients"
import { clientSchema } from "@/schemas/clientSchema"

async function getData(): Promise<Client[]> {
  // In a real app, you would fetch data from your API here.
  // For now, we'll use mock data with a simulated delay
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // Validate the mock data using Zod schema before returning
  const validatedData = mockClients.map(client => {
    const result = clientSchema.safeParse(client)
    if (!result.success) {
      console.error(`Invalid client data for ${client.id}:`, result.error)
      return null
    }
    // Ensure all required Client fields are present
    return {
      ...result.data,
      id: client.id,
      institutionAddress: client.institutionAddress,
      cid: client.cid
    }
  }).filter((c): c is Client => c !== null)
  
  return validatedData
}

export default async function ClientPage() {
  const data = await getData()


  return (
    <div className="container mx-auto py-10">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">PGC Clients</h1>
          <p className="text-muted-foreground">
            Manage and review PGC clients submitted to the genome database.
          </p>
        </div>
        
        
        {/* Data Table */}
        <DataTable columns={columns} data={data} />
      </div>
    </div>
  )
}