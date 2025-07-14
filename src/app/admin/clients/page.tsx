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


async function getData(): Promise<Client[]> {
  try {
    const clients = await getClients();

    const validatedData = clients.map((client) => {
      if (
        !client.cid ||
        !client.affiliationAddress ||
        !["M", "F", "Other"].includes(client.sex ?? "")
      ) {
        return null;
      }
      return client;
    }).filter((c): c is Client => c !== null);

    return validatedData;
  } catch (error) {
    console.error("Failed to fetch clients:", error);
    return []; // prevent crash on error
  }
}

export default function ClientPage() {
  const [data, setData] = useState<Client[]>([]);
  const fetchData = async () => {
    const clients = await getData();
    setData(clients);
  };
  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="container mx-auto py-10">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
          <h1 className="text-3xl font-bold tracking-tight">PGC Clients</h1>
          <p className="text-muted-foreground">
            Manage and review PGC clients submitted to the genome database.
          </p>
        </div>

        <Dialog>
            <DialogTrigger asChild>
              <Button variant="default">Add New Record</Button>
            </DialogTrigger>
            <DialogContent className="max-w-[35rem] w-full">
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
              </DialogHeader>
              <ClientFormModal />
            </DialogContent>
          </Dialog>
        </div>

        {/* Data Table */}
        <DataTable columns={columns} data={data} meta={{ onSuccess: fetchData }} />
      </div>
      </div>
  
  );
}
