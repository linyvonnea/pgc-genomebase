// Admin Projects Page
// Displays a table of all projects and allows adding new project records via a modal form.
// Also shows summary stats for completed, ongoing, and total projects.

"use client";

import { useEffect, useState } from "react";
import { columns } from "./columns"
import { DataTable } from "./data-table"
import { Project } from "@/types/Project"
import { projectSchema } from "@/schemas/projectSchema"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ProjectFormModal } from "@/app/admin/projects/modalform"
import { getProjects } from "@/services/projectsService"

// Fetch all projects from Firestore
async function getData(): Promise<Project[]> {
  try {
    const projects = await getProjects();
    return projects;
  } catch (error) {
    console.error("Failed to fetch inquiries:", error);
    // Return empty array if there's an error
    return [];
  }
}

export default function ProjectPage() {
  // State for project data
  const [data, setData] = useState<Project[]>([]);
  // Fetch data and update state
  const fetchData = async () => {
    const projects = await getData();
    setData(projects);
  };
  useEffect(() => {
    fetchData();
  }, []);

  // Count completed, ongoing, and total projects
  const completedCount = data.filter(project => project.status === "Completed").length;
  const ongoingCount = data.filter(project => project.status === "Ongoing").length;
  const totalCount = data.length;

  return (
    <div className="container mx-auto py-10">
      <div className="space-y-6">
        {/* Header and Add New Project Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground">
              Manage and review the projects submitted to the database.
            </p>
          </div>
          {/* Add New Project Modal */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="default">Add New Record</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Project</DialogTitle>
              </DialogHeader>
              <ProjectFormModal />
            </DialogContent>
          </Dialog>
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
        {/* Data Table with instant update on add/edit/delete */}
        <DataTable columns={columns} data={data} meta={{ onSuccess: fetchData }} />
      </div>
    </div>
  );
}