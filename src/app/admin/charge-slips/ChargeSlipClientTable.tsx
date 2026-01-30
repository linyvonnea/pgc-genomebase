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
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { columns as defaultColumns } from "./columns";
import { VALID_CATEGORIES } from "@/types/ChargeSlipRecord";

import type { ValidCategory } from "@/types/ChargeSlipRecord";

type UIChargeSlipRecord = {
  chargeSlipNumber: string;
  dateIssued?: Date;
  dateOfOR?: Date;
  createdAt?: Date;
  total: number;
  status?: "processing" | "paid" | "cancelled";
  cid: string;
  projectId: string;
  clientInfo: {
    name?: string;
    address: string;
  };
  client: {
    createdAt?: Date;
    address: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
  project: {
    title?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
  categories: ValidCategory[];
  services: { name: string; type: string }[];
  dvNumber?: string;
  orNumber?: string;
  notes?: string;
  preparedBy?: {
    name: string;
    position: string;
  };
};

interface Props {
  data: UIChargeSlipRecord[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns?: ColumnDef<UIChargeSlipRecord, any>[];
}

export function ChargeSlipClientTable({ data, columns = defaultColumns }: Props) {
  const router = useRouter();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("__all");
  const [categoryFilter, setCategoryFilter] = useState<ValidCategory[]>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  // Filter data manually before passing to table
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchesSearch =
        item.chargeSlipNumber?.toLowerCase().includes(globalFilter.toLowerCase()) ||
        item.clientInfo?.name?.toLowerCase().includes(globalFilter.toLowerCase()) ||
        item.client?.name?.toLowerCase().includes(globalFilter.toLowerCase()) ||
        item.project?.title?.toLowerCase().includes(globalFilter.toLowerCase()) ||
        item.cid?.toLowerCase().includes(globalFilter.toLowerCase()) ||
        item.projectId?.toLowerCase().includes(globalFilter.toLowerCase());

      const matchesStatus = statusFilter === "__all" || item.status === statusFilter;

      const recordCategories = item.categories || [];
      const matchesCategory =
        categoryFilter.length === 0 ||
        categoryFilter.some((cat) => recordCategories.includes(cat));

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [data, globalFilter, statusFilter, categoryFilter]);

  // Reset to first page when filters change
  const prevFilterRef = useState({ globalFilter, statusFilter, categoryFilter })[0];
  if (
    prevFilterRef.globalFilter !== globalFilter ||
    prevFilterRef.statusFilter !== statusFilter ||
    JSON.stringify(prevFilterRef.categoryFilter) !== JSON.stringify(categoryFilter)
  ) {
    prevFilterRef.globalFilter = globalFilter;
    prevFilterRef.statusFilter = statusFilter;
    prevFilterRef.categoryFilter = categoryFilter;
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: false,
  });

  const countByStatus = (status: string) =>
    data.filter((item) => item.status === status).length;

  // Calculate totals by status
  const totalsByStatus = useMemo(() => {
    const totals = {
      processing: 0,
      paid: 0,
      cancelled: 0,
    };

    data.forEach((item) => {
      const amount = item.total || 0;
      if (item.status === "processing") totals.processing += amount;
      else if (item.status === "paid") totals.paid += amount;
      else if (item.status === "cancelled") totals.cancelled += amount;
    });

    return totals;
  }, [data]);

  return (
    <div className="space-y-4">
      {/* Category / Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[
          { id: "processing", label: "Processing", color: "text-blue-600", count: countByStatus("processing"), total: totalsByStatus.processing },
          { id: "paid", label: "Paid", color: "text-green-600", count: countByStatus("paid"), total: totalsByStatus.paid },
          { id: "cancelled", label: "Cancelled", color: "text-red-600", count: countByStatus("cancelled"), total: totalsByStatus.cancelled },
        ].map((stat) => (
          <div
            key={stat.id}
            onClick={() => setStatusFilter(statusFilter === stat.id ? "__all" : stat.id)}
            className={`rounded-lg border p-4 cursor-pointer transition-all hover:shadow-md ${statusFilter === stat.id ? "ring-2 ring-primary ring-offset-2 bg-slate-50 border-slate-200" : "bg-white"}`}
          >
            <div className={`text-2xl font-bold ${stat.color}`}>
              ₱{stat.total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="text-sm text-muted-foreground flex justify-between">
              <span>{stat.label}</span>
              <span className="opacity-60">({stat.count})</span>
            </div>
          </div>
        ))}

        <div
          onClick={() => { setStatusFilter("__all"); setCategoryFilter([]); }}
          className={`rounded-lg border p-4 cursor-pointer transition-all hover:shadow-md ${statusFilter === "__all" && categoryFilter.length === 0 ? "ring-2 ring-primary ring-offset-2 bg-slate-50 border-slate-200" : "bg-white"}`}
        >
          <div className="text-2xl font-bold text-gray-700">
            ₱{data.reduce((sum, item) => sum + (item.total || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="text-sm text-muted-foreground flex justify-between">
            <span>Total Records</span>
            <span className="opacity-60">({data.length})</span>
          </div>
        </div>
      </div>

      {/* Category Buttons Row */}
      <div className="flex flex-wrap items-center gap-2 py-2">
        <span className="text-sm text-muted-foreground">Filter Categories:</span>
        {VALID_CATEGORIES.map((cat) => {
          const isActive = categoryFilter.includes(cat);
          return (
            <Button
              key={cat}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (isActive) {
                  setCategoryFilter((prev) => prev.filter((c) => c !== cat));
                } else {
                  setCategoryFilter((prev) => [...prev, cat]);
                }
              }}
              className="h-8 capitalize"
            >
              {cat}
            </Button>
          );
        })}
        {categoryFilter.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setCategoryFilter([])} className="h-8 text-xs">
            Clear
          </Button>
        )}
      </div>

      {/* Header with Search and Pagination */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Input
            placeholder="Search charge slips, clients..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-72"
          />
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Rows:</span>
              <Select
                value={String(pagination.pageSize)}
                onValueChange={(value) => setPagination({ pageIndex: 0, pageSize: Number(value) })}
              >
                <SelectTrigger className="w-[70px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Prev
              </Button>
              <div className="flex items-center justify-center min-w-[80px] text-sm font-medium">
                {pagination.pageIndex + 1} / {table.getPageCount() || 1}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() =>
                    router.push(`/admin/charge-slips/${row.original.chargeSlipNumber}`)
                  }
                  className="cursor-pointer hover:bg-muted transition"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center h-24 text-muted-foreground">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-xs text-muted-foreground px-1">
        Showing {filteredData.length > 0 ? (pagination.pageIndex * pagination.pageSize) + 1 : 0} - {Math.min((pagination.pageIndex + 1) * pagination.pageSize, filteredData.length)} of {filteredData.length} records
      </div>
    </div>
  );
}