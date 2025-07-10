// src/app/admin/quotations/columns.tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { QuotationRecord } from "@/types/Quotation";
import { Badge } from "@/components/ui/badge";

const categoryColors: Record<string, string> = {
  laboratory: "bg-green-100 text-green-800",
  equipment: "bg-blue-100 text-blue-800",
  bioinformatics: "bg-purple-100 text-purple-800",
  retail: "bg-orange-100 text-orange-800",
};

export const columns: ColumnDef<QuotationRecord>[] = [
  {
    accessorKey: "dateIssued",
    header: "Date",
    cell: ({ row }) => {
      const value = row.getValue("dateIssued");
      const date = new Date(
        typeof value === "string" || typeof value === "number" ? value : ""
      );
      return isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
    },
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
      const categories = row.getValue("categories") as string[];
      return (
        <div className="flex flex-wrap gap-1">
          {categories.map((cat) => {
            const color = categoryColors[cat.toLowerCase()] || "bg-gray-100 text-gray-800";
            return (
              <span key={cat} className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
                {cat}
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
      const total = row.getValue("total") as number;
      return `₱${total.toLocaleString()}`;
    },
  },
    {
    accessorKey: "preparedBy",
    header: "Prepared By",
    cell: ({ row }) => {
        const preparedBy = row.getValue("preparedBy") as { name: string; position: string };
        return preparedBy?.name || "—";
    },
  },
];
