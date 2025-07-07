import { columns } from "./columns"
import { DataTable } from "./data-table"
import { Project } from "@/types/Project"
import { mockProjects } from "@/mock/mockProjects"
import { projectSchema } from "@/schemas/projectSchema"

async function getData(): Promise<Project[]> {
  // In a real app, you would fetch data from your API here.
  // For now, we'll use mock data with a simulated delay
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // Validate the mock data using Zod schema before returning
  const validatedData = mockProjects.map(project => {
    // Convert string dates to Date objects for Zod validation
    const toValidate = {
      ...project,
      title: project.title || "Untitled Project",
      startDate: project.startDate ? new Date(project.startDate) : undefined,
      endDate: project.endDate ? new Date(project.endDate) : null,
      projectLead: project.lead,
      fundingInstitution: project.fundingInstitution,
    };
    const result = projectSchema.safeParse(toValidate);
    if (!result.success) {
      console.error(`Invalid project data for ${project.pid}:`, result.error);
      return undefined;
    }
    return project;
  }).filter((p): p is Project => !!p)
  
  return validatedData
}

export default async function ProjectPage() {
  const data = await getData()

  const completedCount = data.filter(project => project.status === "Completed").length;
  const ongoingCount = data.filter(project => project.status === "Ongoing").length;
  const totalCount = data.length


  return (
    <div className="container mx-auto py-10">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage and review the projects submitted to the genome database.
          </p>
        </div>

         {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border p-4">
            <div className="text-2xl font-bold text-green-600">{completedCount}</div>
            <div className="text-sm text-muted-foreground">Completed Projects</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-2xl font-bold text-yellow-600">{ongoingCount}</div>
            <div className="text-sm text-muted-foreground">Ongoing Projects</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-2xl font-bold text-blue-600">{totalCount}</div>
            <div className="text-sm text-muted-foreground">Total Projects</div>
          </div>
        </div>
        
        
        {/* Data Table */}
        <DataTable columns={columns} data={data} />
      </div>
    </div>
  )
}