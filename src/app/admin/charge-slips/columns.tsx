"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ChargeSlipRecord } from "@/types/ChargeSlipRecord";
import { Badge } from "@/components/ui/badge";

const statusColors: Record<string, string> = {
  processing: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const categoryColors: Record<string, string> = {
  laboratory: "bg-green-100 text-green-800",
  equipment: "bg-blue-100 text-blue-800",
  bioinformatics: "bg-purple-100 text-purple-800",
  retail: "bg-orange-100 text-orange-800",
};

export const columns: ColumnDef<ChargeSlipRecord>[] = [
  {
    accessorKey: "dateIssued",
    header: "Date",
    cell: ({ row }) => {
      const value = row.getValue("dateIssued") as Date | string | null | undefined;
      const date = value instanceof Date ? value : new Date(value || "");
      return isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-CA");
    },
  },
  {
    accessorKey: "chargeSlipNumber",
    header: "Charge Slip No.",
  },
  {
    accessorKey: "clientInfo.name",
    header: "Client Name",
    cell: ({ row }) => row.original.clientInfo?.name || "—",
  },
  {
    accessorKey: "total",
    header: "Amount",
    cell: ({ row }) => {
      const value = row.getValue("total") as number;
      return `₱${value.toLocaleString()}`;
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = (row.getValue("status") as string)?.toLowerCase();
      const color = statusColors[status] || "bg-gray-100 text-gray-800";
      return (
        <Badge className={`capitalize ${color}`}>
          {status || "Processing"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "clientInfo.address",
    header: "Address",
    cell: ({ row }) => row.original.clientInfo?.address || "—",
  },
  {
    accessorKey: "project.title",
    header: "Payment For",
    cell: ({ row }) => row.original.project?.title || "—",
  },
  {
    accessorKey: "categories",
    header: "Service Requested",
    cell: ({ row }) => {
      const categories = row.getValue("categories") as string[] | undefined;
      if (!categories?.length) return "—";
      return (
        <div className="flex flex-wrap gap-1">
          {categories.map((cat) => {
            const color = categoryColors[cat.toLowerCase()] || "bg-gray-100 text-gray-800";
            return (
              <span
                key={cat}
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}
              >
                {cat}
              </span>
            );
          })}
        </div>
      );
    },
  },
  {
    accessorKey: "services",
    header: "Service Details",
    cell: ({ row }) => {
      const services = row.original.services;
      return services?.length ? services.map((s) => s.name).join(", ") : "—";
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
    accessorKey: "preparedBy.name",
    header: "Prepared By",
    cell: ({ row }) => row.original.preparedBy?.name || "—",
  },
];