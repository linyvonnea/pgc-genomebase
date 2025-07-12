// src/app/admin/charge-slips/page.tsx
"use client";

import { useEffect, useState } from "react";
import { getAllChargeSlips } from "@/services/chargeSlipService";
import { ChargeSlipRecord } from "@/types/ChargeSlipRecord";
import { columns } from "./column";
import { DataTable } from "./data-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function ChargeSlipsPage() {
  const [data, setData] = useState<ChargeSlipRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId") || "";
  const projectId = searchParams.get("projectId") || "";

  useEffect(() => {
    const fetchSlips = async () => {
      try {
        const records = await getAllChargeSlips();
        setData(records);
      } catch (err) {
        console.error("Failed to load charge slips", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSlips();
  }, []);

  const handleFormSubmit = (data: any) => {
    console.log("Form submitted:", data);
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Charge Slips</h1>
          <p className="text-muted-foreground">
            View, generate, and track charge slips issued for projects.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/charge-slips/builder">New Charge Slip</Link>
        </Button>
      </div>
      <DataTable columns={columns} data={data} />
      <h1 className="text-3xl font-bold tracking-tight mb-6">
        Charge Slip Builder
      </h1>
    </div>
  );
}
