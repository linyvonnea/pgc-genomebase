"use client";

import { useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import SampleFormBuilder from "@/components/sample-form/SampleFormBuilder";

function SampleFormContent() {
  const searchParams = useSearchParams();

  const inquiryId = searchParams.get("inquiryId") ?? undefined;
  const email = searchParams.get("email") ?? undefined;
  const projectId = searchParams.get("pid") ?? undefined;
  const projectTitle = searchParams.get("projectTitle") ?? undefined;
  const submittedByName = searchParams.get("name") ?? undefined;
  const clientId = searchParams.get("clientId") ?? undefined;
  const formId = searchParams.get("formId") ?? undefined;

  const backPath = useMemo(
    () => {
      const params = new URLSearchParams();
      if (email) params.set("email", email);
      if (inquiryId) params.set("inquiryId", inquiryId);
      if (projectId) params.set("pid", projectId);
      const query = params.toString();
      return query ? `/client/client-info?${query}` : "/client/client-info";
    },
    [email, inquiryId, projectId]
  );

  return (
    <SampleFormBuilder
      inquiryId={inquiryId}
      projectId={projectId}
      email={email}
      projectTitle={projectTitle}
      submittedByName={submittedByName}
      clientId={clientId}
      backPath={backPath}
      formId={formId}
    />
  );
}

export default function ClientSampleFormPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading form parameters...</div>}>
      <SampleFormContent />
    </Suspense>
  );
}
