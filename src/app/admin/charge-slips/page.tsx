// src/app/admin/charge-slips/page.tsx

import { getAllChargeSlips } from "@/services/chargeSlipService";
import { ChargeSlipClientTable } from "./ChargeSlipClientTable";
import { ChargeSlipRecord } from "@/types/ChargeSlipRecord";
import { Timestamp } from "firebase/firestore";

// ✅ Local UI-safe type (avoids Firestore constraint issues)
type UIChargeSlipRecord = Omit<
  ChargeSlipRecord,
  "dateIssued" | "dateOfOR" | "createdAt" | "client" | "project"
> & {
  dateIssued?: Date;
  dateOfOR?: Date;
  createdAt?: Date;
  client: {
    createdAt?: Date;
    address: string;
    [key: string]: any;
  };
  project: {
    createdAt?: Date;
    [key: string]: any;
  };
  clientInfo: {
    address: string;
    [key: string]: any;
  };
  categories: string[];
};

// 🔁 Converts Firestore Timestamp, string, or Date → Date
function toDateSafe(value: string | Timestamp | Date | null | undefined): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  }
  if (value instanceof Timestamp) return value.toDate();
  return undefined;
}

// 🧠 Derives categories from selected services
function extractCategories(services: any[]): string[] {
  if (!Array.isArray(services)) return [];
  return Array.from(new Set(services.map((s) => s.type || ""))).filter(Boolean);
}

// 🚀 Fetch charge slip data from Firestore
async function getData(): Promise<ChargeSlipRecord[]> {
  try {
    return await getAllChargeSlips();
  } catch (error) {
    console.error("Failed to fetch charge slips:", error);
    return [];
  }
}

// 🧾 Page component
export default async function ChargeSlipPage() {
  const rawData = await getData();

  const data: UIChargeSlipRecord[] = rawData.map((record) => ({
    ...record,
    dateIssued: toDateSafe(record.dateIssued),
    dateOfOR: toDateSafe(record.dateOfOR),
    createdAt: toDateSafe(record.createdAt),

    client: {
      ...record.client,
      createdAt: toDateSafe(record.client?.createdAt),
      address: record.client?.affiliationAddress || "—",
    },

    project: {
      ...record.project,
      createdAt: toDateSafe(record.project?.createdAt),
    },

    clientInfo: {
      ...record.clientInfo,
      address:
        record.clientInfo?.address ||
        record.client?.affiliationAddress ||
        "—",
    },

    categories: record.categories ?? extractCategories(record.services),
  }));

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          Charge Slip Management
        </h1>
        <p className="text-muted-foreground">
          Review and manage all charge slips issued through GenomeBase.
        </p>
      </div>

      <ChargeSlipClientTable data={data} />
    </div>
  );
}