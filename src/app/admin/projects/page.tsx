// Admin Projects Page
// Displays a table of all projects and allows adding new project records via a modal form.
// Also shows summary stats for completed, ongoing, and total projects.

"use client";

import { useEffect, useState } from "react";
import { columns } from "./columns"
import { DataTable } from "./data-table"
import { Project } from "@/types/Project"
import { projectSchema } from "@/schemas/projectSchema"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Plus, FolderPlus } from "lucide-react"
import { ProjectFormModal } from "@/app/admin/projects/modalform"
import { getProjects } from "@/services/projectsService"
import useAuth from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";

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

import { PermissionGuard } from "@/components/PermissionGuard";

export default function ProjectPage() {
  return (
    <PermissionGuard module="projects" action="view">
      <ProjectPageContent />
    </PermissionGuard>
  );
}

function ProjectPageContent() {
  // State for project data
  const [data, setData] = useState<Project[]>([]);
  // State for dialog open/close
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { adminInfo } = useAuth();
  const { canCreate } = usePermissions(adminInfo?.role);

  // Fetch data and update state
  const fetchData = async () => {
    const projects = await getData();
    setData(projects);
  };
  useEffect(() => {
    fetchData();
  }, []);

  // Handle successful form submission
  const handleFormSuccess = async () => {
    setIsDialogOpen(false);
    await fetchData();
  };


  return (
    <div className="container mx-auto py-4 space-y-3">
      <div className="space-y-1">
        {/* Header and Add New Project Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
            <p className="text-sm text-muted-foreground">
              Manage and review the projects submitted to the database.
            </p>
          </div>
          {/* Add New Project Modal */}
          {canCreate("projects") && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transition-all duration-200">
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Project
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="space-y-3 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <FolderPlus className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <DialogTitle className="text-2xl">Add New Project</DialogTitle>
                      <DialogDescription className="text-sm mt-1">
                        Create a new project record with complete details
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <Separator />
                <ProjectFormModal onSubmit={handleFormSuccess} />
              </DialogContent>
            </Dialog>
          )}
        </div>
        {/* Data Table with instant update on add/edit/delete */}
        <DataTable columns={columns} data={data} meta={{ onSuccess: fetchData }} />
      </div>
    </div>
  );
}