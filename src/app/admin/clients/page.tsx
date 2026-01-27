// Admin Clients Page
// Displays a table of all PGC clients and allows adding new client records via a modal form.

"use client";

import { useEffect, useState } from "react";
import { columns } from "./columns";
import { DataTable } from "./data-table";
import { Client } from "@/types/Client";
import { getClients } from "@/services/clientService";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Plus, UserPlus } from "lucide-react"
import { ProjectFormModal } from "@/app/admin/projects/modalform"
import { ClientFormModal } from "./modalform";
import { useAdminRole } from "@/hooks/useAdminRole";
import { hasPermission } from "@/lib/permissions";

// Fetch and validate client data from Firestore
async function getData(): Promise<Client[]> {
  try {
    const clients = await getClients();
    // Only filter out clients with missing cid (required key)
    const validatedData = clients.filter((client) => !!client.cid);
    return validatedData;
  } catch (error) {
    console.error("Failed to fetch clients:", error);
    return []; // prevent crash on error
  }
}

import { PermissionGuard } from "@/components/PermissionGuard";

export default function ClientPage() {
  return (
    <PermissionGuard module="clients" action="view">
      <ClientPageContent />
    </PermissionGuard>
  );
}

function ClientPageContent() {
  // State for client data
  const [data, setData] = useState<Client[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const { role } = useAdminRole();
  const canManageClients = hasPermission(role, "manage_clients");
  
  // Fetch data and update state
  const fetchData = async () => {
    console.log("ClientPage.fetchData: start"); // debug
    const clients = await getData();
    console.log("ClientPage.fetchData: fetched clients.length =", clients?.length); // debug
    if (clients?.length) console.log("ClientPage.fetchData: first client =", clients[0]); // debug
    setData(clients);
  };
  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="container mx-auto py-10">
      <div className="space-y-6">
        {/* Header and Add New Client Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">PGC Clients</h1>
            <p className="text-muted-foreground">
              Manage and review PGC clients submitted to the database.
            </p>
          </div>
          {/* Add New Client Modal */}
          {canManageClients && (
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transition-all duration-200">
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Client
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-[35rem] w-full max-h-[90vh] overflow-y-auto">
              <DialogHeader className="space-y-3 pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <UserPlus className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl">Add New Client</DialogTitle>
                    <DialogDescription className="text-sm mt-1">
                      Create a new client record and link to project
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <Separator />
              <ClientFormModal onSubmit={fetchData} onClose={() => setOpenDialog(false)} />
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
