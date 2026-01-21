// Admin Clients Page
// Displays a table of all PGC clients and allows adding new client records via a modal form.

"use client";

import { useEffect, useState } from "react";
import { columns } from "./columns";
import { DataTable } from "./data-table";
import { Client } from "@/types/Client";
import { getClients } from "@/services/clientService";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ProjectFormModal } from "@/app/admin/projects/modalform"
import { ClientFormModal } from "./modalform";

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

export default function ClientPage() {
  // State for client data
  const [data, setData] = useState<Client[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
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
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button variant="default">Add New Record</Button>
            </DialogTrigger>
            <DialogContent className="max-w-[35rem] w-full max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
              </DialogHeader>
              <ClientFormModal onSubmit={fetchData} onClose={() => setOpenDialog(false)} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Data Table with instant update on add/edit/delete */}
        <DataTable columns={columns} data={data} meta={{ onSuccess: fetchData }} />
      </div>
    </div>
  );
}
