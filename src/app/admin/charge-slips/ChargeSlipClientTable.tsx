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
import { ChevronsLeft, ChevronsRight, Filter } from "lucide-react";
import { columns as defaultColumns } from "./columns";

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
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  // Filter data manually before passing to table
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // 1. Global Filter
      const q = globalFilter.trim().toLowerCase();
      const haystack =
        `${item.chargeSlipNumber || ""} ${item.clientInfo?.name || ""} ${item.client?.name || ""} ${item.project?.title || ""} ${item.cid || ""} ${item.projectId || ""}`
          .toLowerCase();
      const matchesSearch = q === "" || haystack.includes(q);

      // 2. Status Filter
      const matchesStatus = statusFilter === "__all" || item.status === statusFilter;

      // 3. Category Filter
      const recordCats = item.categories || [];
      const matchesCategory =
        categoryFilter.length === 0 ||
        categoryFilter.some((cat) => {
          const target = cat === "Retail Sales" ? "retail" : cat.toLowerCase();
          return recordCats.some(c => c?.toLowerCase() === target.toLowerCase());
        });

      return matchesSearch && matchesCategory;
    });
  }, [data, globalFilter, categoryFilter]);

  // Total Summary for the filtered data
  const filteredTotalValue = useMemo(() => {
    return filteredData.reduce((sum, item) => sum + (item.total || 0), 0);
  }, [filteredData]);

  // Reset to first page when filters change
  const prevFilterRef = useState({ globalFilter, categoryFilter })[0];
  if (
    prevFilterRef.globalFilter !== globalFilter ||
    JSON.stringify(prevFilterRef.categoryFilter) !== JSON.stringify(categoryFilter)
  ) {
    prevFilterRef.globalFilter = globalFilter;
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

  // Categories
  const categories = [
    { name: "Laboratory", color: "text-green-600", border: "border-green-200", bg: "bg-green-50" },
    { name: "Equipment", color: "text-blue-600", border: "border-blue-200", bg: "bg-blue-50" },
    { name: "Bioinformatics", color: "text-purple-600", border: "border-purple-200", bg: "bg-purple-50" },
    { name: "Retail Sales", color: "text-orange-600", border: "border-orange-200", bg: "bg-orange-50" },
    { name: "Training", color: "text-indigo-600", border: "border-indigo-200", bg: "bg-indigo-50" },
  ];

  // Statuses
  const statuses = [
    { id: "processing", label: "Processing", color: "text-blue-500", border: "border-blue-200", bg: "bg-blue-50" },
    { id: "paid", label: "Paid", color: "text-green-600", border: "border-green-200", bg: "bg-green-50" },
    { id: "cancelled", label: "Cancelled", color: "text-red-500", border: "border-red-200", bg: "bg-red-50" },
  ];

  const countByCategory = (catName: string) =>
    data.filter((item) => {
      const target = catName === "Retail Sales" ? "retail" : catName.toLowerCase();
      return (item.categories || []).some((c) => c.toLowerCase() === target);
    }).length;

  const countByStatus = (status: string) =>
    data.filter((item) => item.status === status).length;

  return (
    <div className="space-y-4">
      {/* Category Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {categories.map((cat) => {
          const isActive = categoryFilter.includes(cat.name);
          return (
            <div
              key={cat.name}
              onClick={() => {
                if (isActive) {
                  setCategoryFilter(categoryFilter.filter(c => c !== cat.name));
                } else {
                  setCategoryFilter([...categoryFilter, cat.name]);
                }
              }}
              className={`rounded-lg border p-4 cursor-pointer transition-all hover:shadow-md ${isActive
                ? `ring-2 ring-primary ring-offset-2 ${cat.bg} ${cat.border}`
                : "bg-white"
                }`}
            >
              <div className={`text-2xl font-bold ${cat.color}`}>
                {countByCategory(cat.name)}
              </div>
              <div className="text-sm text-muted-foreground">{cat.name}</div>
            </div>
          );
        })}
      </div>

      {/* Status Cards Row + Total Card */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statuses.map((stat) => {
          const isActive = statusFilter === stat.id;
          return (
            <div
              key={stat.id}
              onClick={() => setStatusFilter(isActive ? "__all" : stat.id)}
              className={`rounded-lg border p-4 cursor-pointer transition-all hover:shadow-md ${isActive
                ? `ring-2 ring-primary ring-offset-2 ${stat.bg} ${stat.border}`
                : "bg-white"
                }`}
            >
              <div className={`text-2xl font-bold ${stat.color}`}>
                {countByStatus(stat.id)}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          );
        })}

        {/* Total card - Displays combined total of filtered records */}
        <div
          onClick={() => { setCategoryFilter([]); setStatusFilter("__all"); }}
          className={`rounded-lg border p-4 cursor-pointer transition-all hover:shadow-md ${categoryFilter.length === 0 && statusFilter === "__all"
            ? "ring-2 ring-primary ring-offset-2 bg-slate-50 border-slate-200"
            : "bg-white"
            }`}
        >
          <div className="text-2xl font-bold text-gray-700 flex items-center gap-2">
            ₱{filteredTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-sm text-muted-foreground flex justify-between items-center">
            <span>Total Amount</span>
            {(categoryFilter.length > 0 || statusFilter !== "__all") && <Badge variant="secondary" className="text-[10px] h-4">Filtered</Badge>}
          </div>
        </div>
      </div>

      {/* Header with Search and Pagination */}
      <div className="flex flex-wrap items-end justify-between gap-4 pt-2">
        <div className="space-y-2">
          <Input
            placeholder="Search client, charge slip, project..."
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
                  {[10, 20, 50, 100].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
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
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort?.();
                  const sortDir = header.column.getIsSorted?.();
                  return (
                    <TableHead
                      key={header.id}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      className={canSort ? "cursor-pointer select-none" : ""}
                    >
                      <div className="flex items-center gap-1">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && (
                          <span className="ml-1 text-xs opacity-60">
                            {sortDir === "asc" ? "▲" : sortDir === "desc" ? "▼" : ""}
                          </span>
                        )}
                      </div>
                    </TableHead>
                  );
                })}
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
                  <div className="flex flex-col items-center justify-center gap-2 py-4">
                    <Filter className="h-8 w-8 opacity-20" />
                    <p>No results found for current filters.</p>
                    <Button variant="link" onClick={() => { setCategoryFilter([]); setStatusFilter("__all"); setGlobalFilter(""); }}>Clear all filters</Button>
                  </div>
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