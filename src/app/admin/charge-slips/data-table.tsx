"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ChargeSlipRecord } from "@/types/ChargeSlipRecord";
import { Input } from "@/components/ui/input";

export const columns: ColumnDef<ChargeSlipRecord>[] = [
  {
    accessorKey: "dateIssued",
    header: "Date",
    cell: ({ row }) => {
      const raw = row.getValue("dateIssued");
      const date = raw ? new Date(raw as string) : null;
      return date && !isNaN(date.getTime())
        ? date.toLocaleDateString("en-CA")
        : "—";
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
    cell: ({ row }) =>
      `₱${(row.getValue("total") as number)?.toLocaleString()}`,
  },
  {
    accessorKey: "orNumber",
    header: "OR No.",
    cell: ({ row }) => (
      <Input
        defaultValue={row.getValue("orNumber") as string}
        onBlur={(e) => {
          // TODO: update OR No. in Firestore
        }}
        className="w-32 text-xs"
      />
    ),
  },
  {
    accessorKey: "dateOfOR",
    header: "Date of OR",
    cell: ({ row }) => {
      const raw = row.getValue("dateOfOR");
      let iso = "";

      try {
        const date = new Date(raw as string);
        if (!isNaN(date.getTime())) {
          iso = date.toISOString().split("T")[0];
        }
      } catch {
        iso = "";
      }

      return (
        <Input
          type="date"
          defaultValue={iso}
          onBlur={(e) => {
            // TODO: update dateOfOR in Firestore
          }}
          className="w-40 text-xs"
        />
      );
    },
  },
  {
    accessorKey: "dvNumber",
    header: "DV No.",
    cell: ({ row }) => (
      <Input
        defaultValue={row.getValue("dvNumber") as string}
        onBlur={(e) => {
          // TODO: update DV No. in Firestore
        }}
        className="w-40 text-xs"
      />
    ),
  },
  {
    accessorKey: "notes",
    header: "Notes",
    cell: ({ row }) => (
      <Input
        defaultValue={row.getValue("notes") as string}
        onBlur={(e) => {
          // TODO: update Notes in Firestore
        }}
        className="w-64 text-xs"
      />
    ),
  },
  {
    accessorKey: "preparedBy.name",
    header: "Prepared By",
    cell: ({ row }) => row.original.preparedBy?.name || "—",
  },
];