// src/app/admin/charge-slips/builder/page.tsx
"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getClientById, getProjectById } from "@/services/clientProjectService";
import { PermissionGuard } from "@/components/PermissionGuard";

const ChargeSlipBuilder = dynamic(() => import("@/components/charge-slip/ChargeSlipBuilder"), { ssr: false });

class ErrorBoundary extends React.Component<any, { hasError: boolean; error?: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, info: any) {
    console.error("ChargeSlipBuilder render error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <h2 className="text-xl font-semibold text-red-600">Failed to load Charge Slip Builder</h2>
          <pre className="mt-4 text-sm text-gray-700">{String(this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function ChargeSlipBuilderPage() {
  return (
    <PermissionGuard module="chargeSlips" action="view">
      <ChargeSlipBuilderContent />
    </PermissionGuard>
  );
}

function ChargeSlipBuilderContent() {
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
        clientData={clientData || null}
        projectData={projectData || null}  //allow empty project
        onSubmit={(data: any) => console.log("Form submitted:", data)}
      />
    </main>
  );
}

//test change
