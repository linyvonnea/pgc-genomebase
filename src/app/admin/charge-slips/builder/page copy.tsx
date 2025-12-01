// src/app/admin/charge-slips/builder/page.tsx
"use client";

import ChargeSlipBuilder from "@/components/charge-slip/ChargeSlipBuilder";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getClientById, getProjectById } from "@/services/clientProjectService";

export default function ChargeSlipBuilderPage() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId") || "";
  const projectId = searchParams.get("projectId") || "";

  const { data: clientData } = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => getClientById(clientId),
    enabled: !!clientId,
  });

  const { data: projectData } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProjectById(projectId),
    enabled: !!projectId,
  });


  return (
    <main className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Charge Slip Builder</h1>
      <ChargeSlipBuilder
        clientId={clientId}
        projectId={projectId}
        clientData={clientData || null }
        projectData={projectData || null}
        onSubmit={(data) => console.log("Form submitted:", data)}
      />
    </main>
  );
}
