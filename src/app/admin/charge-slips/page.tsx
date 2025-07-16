import { getAllChargeSlips } from "@/services/chargeSlipService";
import { ChargeSlipClientTable } from "./ChargeSlipClientTable";
import { columns } from "./columns";
import { ChargeSlipRecord } from "@/types/ChargeSlipRecord";
import { Timestamp } from "firebase/firestore";
import { UIChargeSlipRecord } from "@/types/UIChargeSlipRecord";
import { ValidCategory } from "@/types/ValidCategory";

// Converts Firestore Timestamp, string, or Date → Date
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

// Allowed top-level categories
const VALID_CATEGORIES: ValidCategory[] = ["laboratory", "equipment", "bioinformatics", "retail"];

// Extracts only valid service `type` values
function extractValidCategories(services: any[]): ValidCategory[] {
  if (!Array.isArray(services)) return [];
  return Array.from(
    new Set(
      services
        .map((s) => (s.type || "").toLowerCase())
        .filter((type): type is ValidCategory => VALID_CATEGORIES.includes(type as ValidCategory))
    )
  );
}

// Normalize status
function normalizeStatus(status?: string): "paid" | "cancelled" | "processing" {
  const safe = (status || "processing").toLowerCase();
  if (safe === "paid" || safe === "cancelled" || safe === "processing") return safe;
  return "processing";
}

// Server Component: Charge Slip Management Page
export default async function ChargeSlipPage() {
  const rawData: ChargeSlipRecord[] = await getAllChargeSlips();

  const data: UIChargeSlipRecord[] = rawData.map((record) => {
    // ✅ Always compute categories from services
    const categories: ValidCategory[] = extractValidCategories(record.services);

    return {
      ...record,
      status: normalizeStatus(record.status),

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
        address: record.clientInfo?.address || record.client?.affiliationAddress || "—",
      },

      categories,
    };
  });

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Charge Slip Management</h1>
        <p className="text-muted-foreground">
          Review and manage all charge slips issued through GenomeBase.
        </p>
      </div>

      <ChargeSlipClientTable data={data} columns={columns} />
    </div>
  );
}