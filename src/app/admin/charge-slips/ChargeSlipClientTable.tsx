// src/components/charge-slip/ChargeSlipClientTable.tsx
"use client";

import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "./columns";
import { Row } from "@tanstack/react-table";

// Use a local UI-safe type to match the cleaned `page.tsx` structure
type UIChargeSlipRecord = {
  chargeSlipNumber: string;
  dateIssued?: Date;
  dateOfOR?: Date;
  createdAt?: Date;
  total: number;
  status?: "processing" | "paid" | "cancelled";
  cid: string;
  projectId: string;
  clientInfo: {
    name?: string;
    address: string;
  };
  client: {
    createdAt?: Date;
    address: string;
    [key: string]: any;
  };
  project: {
    title?: string;
    [key: string]: any;
  };
  categories: string[];
  services: { name: string; type: string }[];
  dvNumber?: string;
  orNumber?: string;
  notes?: string;
  preparedBy?: {
    name: string;
    position: string;
  };
};

interface Props {
  data: UIChargeSlipRecord[];
}

export function ChargeSlipClientTable({ data }: Props) {
  const router = useRouter();

  return (
    <DataTable
      columns={columns}
      data={data}
      onRowClick={(row: Row<UIChargeSlipRecord>) => {
        const chargeSlipNumber = row.original.chargeSlipNumber;
        if (chargeSlipNumber) {
          router.push(`/admin/charge-slips/${chargeSlipNumber}`);
        }
      }}
    />
  );
}