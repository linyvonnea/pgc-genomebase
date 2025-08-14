"use client";

import { ColumnDef } from "@tanstack/react-table";
import { UIChargeSlipRecord } from "@/types/UIChargeSlipRecord";
import { Badge } from "@/components/ui/badge";
import { ValidCategory } from "@/types/ValidCategory";

// Badge colors for statuses
const statusColors: Record<string, string> = {
  processing: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

// Badge colors for categories
const categoryColors: Record<ValidCategory, string> = {
  laboratory: "bg-green-100 text-green-800",
  equipment: "bg-blue-100 text-blue-800",
  bioinformatics: "bg-purple-100 text-purple-800",
  retail: "bg-orange-100 text-orange-800",
};

// normalize to epoch ms for proper numeric sorting
function toMillis(v: unknown): number {
  if (!v) return NaN;
  if (typeof v === "number") return v;
  if (typeof v === "string") return new Date(v).getTime();
  const anyV = v as any;
  if (typeof anyV?.toDate === "function") return anyV.toDate().getTime(); // Firestore Timestamp
  if (v instanceof Date) return v.getTime();
  return NaN;
}

export const columns: ColumnDef<UIChargeSlipRecord, any>[] = [
  {
    id: "dateIssued",
    header: "Date",
    accessorFn: (row) => toMillis((row as any).dateIssued),
    cell: ({ getValue }) => {
      const ms = getValue<number>();
      return isNaN(ms) ? "—" : new Date(ms).toLocaleDateString("en-CA");
    },
    sortDescFirst: true,
  },
  {
    accessorKey: "chargeSlipNumber",
    header: "Charge Slip No.",
  },
  {
    accessorFn: (row) => row.clientInfo?.name,
    id: "clientInfo.name",
    header: "Client Name",
    cell: ({ getValue }) => getValue() || "—",
  },
  {
    accessorKey: "total",
    header: "Amount",
    cell: ({ row }) => {
      const value = Number(row.getValue("total") ?? 0);
      return `₱${value.toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const raw = String(row.getValue("status") ?? "processing").toLowerCase();
      const color = statusColors[raw] || "bg-gray-100 text-gray-800";
      return <Badge className={`capitalize ${color}`}>{raw}</Badge>;
    },
  },
  {
    accessorKey: "datePaid",
    header: "Date Paid",
    cell: ({ row }) => {
      const raw = row.getValue("datePaid") as Date | string | undefined | null;
      const date = raw instanceof Date ? raw : new Date(raw || "");
      return isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-CA");
    },
  },
  {
    accessorFn: (row) => row.clientInfo?.address,
    id: "clientInfo.address",
    header: "Address",
    cell: ({ getValue }) => getValue() || "—",
  },
  {
    accessorFn: (row) => row.project?.title,
    id: "project.title",
    header: "Payment For",
    cell: ({ getValue }) => getValue() || "—",
  },
  {
    accessorKey: "categories",
    header: "Service Requested",
    cell: ({ row }) => {
      const categories = (row.getValue("categories") as ValidCategory[] | undefined) ?? [];
      if (!categories.length) return "—";
      return (
        <div className="flex flex-wrap gap-1">
          {categories.map((cat) => (
            <span
              key={cat}
              className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${categoryColors[cat]}`}
            >
              {cat}
            </span>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: "dvNumber",
    header: "DV No.",
    cell: ({ row }) => row.getValue("dvNumber") || "—",
  },
  {
    accessorKey: "orNumber",
    header: "OR No.",
    cell: ({ row }) => row.getValue("orNumber") || "—",
  },
  {
    accessorKey: "dateOfOR",
    header: "Date of OR",
    cell: ({ row }) => {
      const raw = row.getValue("dateOfOR") as Date | string | undefined | null;
      const date = raw instanceof Date ? raw : new Date(raw || "");
      return isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-CA");
    },
  },
  {
    accessorKey: "notes",
    header: "Notes",
    cell: ({ row }) => row.getValue("notes") || "—",
  },
  {
    accessorFn: (row) => row.preparedBy?.name,
    id: "preparedBy.name",
    header: "Prepared By",
    cell: ({ getValue }) => getValue() || "—",
  },
];