"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function NewChargeSlipPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const clientId = searchParams.get("clientId");
    const projectId = searchParams.get("projectId");

    if (clientId && projectId) {
      router.push(`/admin/charge-slips/builder?clientId=${clientId}&projectId=${projectId}`);
    } else {
      console.error("Missing clientId or projectId in URL parameters.");
    }
  }, [router, searchParams]);

  return null;
}
