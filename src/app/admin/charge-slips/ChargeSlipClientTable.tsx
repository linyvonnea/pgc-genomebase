// src/app/admin/charge-slips/ChargeSlipClientTable.tsx
"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ChargeSlipRecord } from "@/types/ChargeSlipRecord";
import { columns } from "./column";
import { DataTable } from "./data-table";

interface ChargeSlipClientTableProps {
  data: ChargeSlipRecord[];
}

export function ChargeSlipClientTable({ data }: ChargeSlipClientTableProps) {
  return <DataTable columns={columns} data={data} />;
}