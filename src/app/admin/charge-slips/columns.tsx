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
  training: "bg-indigo-100 text-indigo-800",
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
    size: 100,
    cell: ({ getValue }) => {
      const ms = getValue<number>();
      return isNaN(ms) ? "—" : new Date(ms).toLocaleDateString("en-CA");
    },
    sortDescFirst: true,
  },
  {
    accessorKey: "chargeSlipNumber",
    header: "Charge Slip No.",
    size: 140,
  },
  {
    accessorFn: (row) => row.clientInfo?.name,
    id: "clientInfo.name",
    header: "Client Name",
    size: 200,
    cell: ({ getValue }) => {
      const name = getValue() as string || "—";
      return (
        <div className="max-w-[200px] truncate" title={name}>
          {name}
        </div>
      );
    },
  },
  {
    accessorKey: "total",
    header: () => <div className="text-right">Amount</div>,
    size: 120,
    cell: ({ row }) => {
      const value = Number(row.getValue("total") ?? 0);
      return (
        <div className="text-right font-medium">
          ₱{value.toLocaleString("en-PH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    size: 110,
    cell: ({ row }) => {
      const raw = String(row.getValue("status") ?? "processing").toLowerCase();
      const color = statusColors[raw] || "bg-gray-100 text-gray-800";
      return <Badge className={`capitalize ${color} hover:${color} shadow-none`}>{raw}</Badge>;
    },
  },
  {
    accessorKey: "categories",
    header: "Service Requested",
    size: 200,
    cell: ({ row }) => {
      const categories = (row.getValue("categories") as ValidCategory[] | undefined) ?? [];
      if (!categories.length) return <span className="text-muted-foreground">—</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {categories.map((cat) => (
            <span
              key={cat}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize ${categoryColors[cat] ?? "bg-gray-50 border-gray-200 text-gray-700"}`}
            >
              {cat}
            </span>
          ))}
        </div>
      );
    },
  },
  {
    accessorFn: (row) => row.project?.title,
    id: "project.title",
    header: "Payment For",
    size: 220,
    cell: ({ getValue }) => {
      const title = getValue() as string || "—";
      return (
        <div className="max-w-[220px] truncate" title={title}>
          {title}
        </div>
      );
    },
  },
  {
    accessorKey: "datePaid",
    header: "Date Paid",
    size: 100,
    cell: ({ row }) => {
      const raw = row.getValue("datePaid") as Date | string | undefined | null;
      const date = raw instanceof Date ? raw : new Date(raw || "");
      return <div className="text-muted-foreground">{isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-CA")}</div>;
    },
  },
  {
    accessorKey: "orNumber",
    header: "OR No.",
    size: 100,
    cell: ({ row }) => <span className="font-mono text-xs">{row.getValue("orNumber") || "—"}</span>,
  },
  {
    accessorKey: "dvNumber",
    header: "DV No.",
    size: 100,
    cell: ({ row }) => <span className="font-mono text-xs">{row.getValue("dvNumber") || "—"}</span>,
  },
  // Hidden columns - Access via Detail View/Modal
  // {
  //   accessorFn: (row) => row.clientInfo?.address,
  //   id: "clientInfo.address",
  //   header: "Address",
  // },
  // {
  //   accessorFn: (row) => row.project?.title,
  //   id: "project.title",
  //   header: "Payment For",
  // },
  // {
  //   accessorKey: "dateOfOR",
  //   header: "Date of OR",
  // },
  // {
  //   accessorKey: "notes",
  //   header: "Notes",
  // },
  // {
  //   accessorFn: (row) => row.preparedBy?.name,
  //   id: "preparedBy.name",
  //   header: "Prepared By",
  // },
];