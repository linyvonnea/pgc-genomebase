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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Filter, Info } from "lucide-react";
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
    [key: string]: any;
  };
  project: {
    title?: string;
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
    setPagination({ ...pagination, pageIndex: 0 });
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

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Input
          placeholder="Search client, CS number, etc."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="w-72"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          className={`rounded-lg border p-4 text-center cursor-pointer transition-all hover:shadow-md hover:scale-105 ${statusFilter === "processing" ? "ring-2 ring-blue-600 bg-blue-50" : "hover:bg-blue-50/50"
            }`}
          onClick={() => setStatusFilter(statusFilter === "processing" ? "__all" : "processing")}
        >
          <div className="text-2xl font-bold text-blue-600">
            {countByStatus("processing")}
          </div>
          <div className="text-sm text-muted-foreground">Processing</div>
        </div>
        <div
          className={`rounded-lg border p-4 text-center cursor-pointer transition-all hover:shadow-md hover:scale-105 ${statusFilter === "paid" ? "ring-2 ring-green-600 bg-green-50" : "hover:bg-green-50/50"
            }`}
          onClick={() => setStatusFilter(statusFilter === "paid" ? "__all" : "paid")}
        >
          <div className="text-2xl font-bold text-green-600">
            {countByStatus("paid")}
          </div>
          <div className="text-sm text-muted-foreground">Paid</div>
        </div>
        <div
          className={`rounded-lg border p-4 text-center cursor-pointer transition-all hover:shadow-md hover:scale-105 ${statusFilter === "cancelled" ? "ring-2 ring-red-600 bg-red-50" : "hover:bg-red-50/50"
            }`}
          onClick={() => setStatusFilter(statusFilter === "cancelled" ? "__all" : "cancelled")}
        >
          <div className="text-2xl font-bold text-red-600">
            {countByStatus("cancelled")}
          </div>
          <div className="text-sm text-muted-foreground">Cancelled</div>
        </div>
        <div className="rounded-lg border p-4 text-center bg-gradient-to-br from-slate-50 to-slate-100">
          <div className="text-2xl font-bold text-slate-700">
            ₱{(() => {
              // Calculate total based on active filters
              let filtered = data;

              // Apply status filter
              if (statusFilter !== "__all") {
                filtered = filtered.filter(item => item.status === statusFilter);
              }

              // Apply category filter
              if (categoryFilter.length > 0) {
                filtered = filtered.filter(item => {
                  const itemCategories = item.categories || [];
                  return categoryFilter.some(cat => itemCategories.includes(cat));
                });
              }

              // Sum the totals
              const total = filtered.reduce((sum, item) => sum + (item.total || 0), 0);
              return total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            })()}
          </div>
          <div className="text-sm text-muted-foreground font-medium">
            {statusFilter === "__all" && categoryFilter.length === 0
              ? "Grand Total"
              : "Filtered Total"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {statusFilter === "__all" && categoryFilter.length === 0
              ? "All Statuses"
              : (() => {
                const parts = [];
                if (statusFilter !== "__all") parts.push(statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1));
                if (categoryFilter.length > 0) parts.push(categoryFilter.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(", "));
                return parts.join(" • ");
              })()}
          </div>
        </div>
      </div>

      {/* Service Category Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {VALID_CATEGORIES.map((cat) => {
          const isActive = categoryFilter.includes(cat);
          const categoryColors = {
            laboratory: { text: "text-purple-600", ring: "ring-purple-600", bg: "bg-purple-50", hover: "hover:bg-purple-50/50" },
            equipment: { text: "text-orange-600", ring: "ring-orange-600", bg: "bg-orange-50", hover: "hover:bg-orange-50/50" },
            bioinformatics: { text: "text-cyan-600", ring: "ring-cyan-600", bg: "bg-cyan-50", hover: "hover:bg-cyan-50/50" },
            retail: { text: "text-pink-600", ring: "ring-pink-600", bg: "bg-pink-50", hover: "hover:bg-pink-50/50" },
            training: { text: "text-indigo-600", ring: "ring-indigo-600", bg: "bg-indigo-50", hover: "hover:bg-indigo-50/50" },
          };
          const colors = categoryColors[cat as keyof typeof categoryColors];

          return (
            <div
              key={cat}
              className={`rounded-lg border p-3 text-center cursor-pointer transition-all hover:shadow-md hover:scale-105 ${isActive ? `ring-2 ${colors.ring} ${colors.bg}` : colors.hover
                }`}
              onClick={() => {
                if (isActive) {
                  setCategoryFilter((prev) => prev.filter((c) => c !== cat));
                } else {
                  setCategoryFilter((prev) => [...prev, cat]);
                }
              }}
            >
              <div className={`text-sm font-semibold capitalize ${colors.text}`}>
                {cat}
              </div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="rounded-md border">
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
                  className="hover:bg-muted/40 cursor-pointer"
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
                <TableCell colSpan={columns.length} className="text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {table.getRowModel().rows.length > 0 ? pagination.pageIndex * pagination.pageSize + 1 : 0} to{" "}
          {Math.min((pagination.pageIndex + 1) * pagination.pageSize, filteredData.length)} of{" "}
          {filteredData.length} filtered results
          {filteredData.length !== data.length && ` (${data.length} total)`}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(value) => setPagination({ pageIndex: 0, pageSize: Number(value) })}
            >
              <SelectTrigger className="w-20 h-8">
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

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <div className="text-sm font-medium px-2">
              Page {pagination.pageIndex + 1} of {table.getPageCount()}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              Last
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}