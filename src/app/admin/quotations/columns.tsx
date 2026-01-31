"use client";

import { ColumnDef } from "@tanstack/react-table";
import { QuotationRecord } from "@/types/Quotation";

const categoryColors: Record<string, string> = {
  laboratory: "bg-green-100 text-green-800",
  equipment: "bg-blue-100 text-blue-800",
  bioinformatics: "bg-purple-100 text-purple-800",
  retail: "bg-orange-100 text-orange-800",
};

// helper to read any of: ISO string | number | Firestore Timestamp | Date
function toMillis(v: unknown): number {
  if (!v) return NaN;
  if (typeof v === "number") return v; // already ms
  if (typeof v === "string") return new Date(v).getTime();
  // Firestore Timestamp has toDate()
  const anyV = v as any;
  if (typeof anyV?.toDate === "function") return anyV.toDate().getTime();
  if (v instanceof Date) return v.getTime();
  return NaN;
}

export const columns: ColumnDef<QuotationRecord>[] = [
  {
    id: "dateIssued",
    header: "Date",
    // return a number (ms) so sorting is numeric & correct
    accessorFn: (row) => toMillis((row as any).dateIssued),
    // render it back as a date
    cell: ({ getValue }) => {
      const ms = getValue<number>();
      return isNaN(ms) ? "-" : new Date(ms).toLocaleDateString();
    },
    sortDescFirst: true,
  },
  {
    accessorKey: "referenceNumber",
    header: "Reference No.",
  },
  {
    accessorKey: "name",
    header: "Client",
  },
  {
    accessorKey: "designation",
    header: "Designation",
  },
  {
    accessorKey: "institution",
    header: "Institution",
  },
  {
    accessorKey: "categories",
    header: "Category",
    cell: ({ row }) => {
      const categories = (row.getValue("categories") as string[]) ?? [];
      return (
        <div className="flex flex-wrap gap-1">
          {categories.map((cat) => {
            const color =
              categoryColors[cat?.toLowerCase?.() || ""] ||
              "bg-gray-100 text-gray-800";
            return (
              <span
                key={cat}
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}
              >
                {cat?.charAt?.(0)?.toUpperCase?.() + cat?.slice?.(1)}
              </span>
            );
          })}
        </div>
      );
    },
  },
  {
    accessorKey: "total",
    header: "Total",
    cell: ({ row }) => {
      const total = Number(row.getValue("total") ?? 0);
      return `₱${total.toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    },
  },
  {
    accessorKey: "preparedBy",
    header: "Prepared By",
    cell: ({ row }) => {
      const preparedBy = row.getValue("preparedBy") as
        | { name?: string; position?: string }
        | undefined;
      return preparedBy?.name || "—";
    },
  },
];