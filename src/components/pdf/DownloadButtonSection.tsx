// src/components/pdf/DownloadButtonSection.tsx
"use client";

import dynamic from "next/dynamic";
import type { SelectedService } from "@/types/SelectedService";

const DownloadPDFWrapper = dynamic(() => import("./DownloadPDFWrapper"), { ssr: false });

export default function DownloadButtonSection(props: {
  referenceNumber: string;
  services: SelectedService[];
  clientInfo: {
    name: string;
    institution: string;
    designation: string;
    email: string;
  };
  useInternalPrice: boolean;
}) {
  return (
    <div className="mt-4">
      <DownloadPDFWrapper {...props} />
    </div>
  );
}