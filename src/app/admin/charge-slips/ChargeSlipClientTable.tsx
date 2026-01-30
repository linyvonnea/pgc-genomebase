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
import { Filter, Info, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
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

  // Calculate totals by category
  const totalsByCategory = useMemo(() => {
    const totals: Record<ValidCategory, number> = {
      laboratory: 0,
      equipment: 0,
      bioinformatics: 0,
      retail: 0,
      training: 0,
    };

    data.forEach((item) => {
      const amount = item.total || 0;
      const categories = item.categories || [];

      // Distribute amount evenly across categories if multiple
      const amountPerCategory = categories.length > 0 ? amount / categories.length : 0;

      categories.forEach((cat) => {
        if (cat in totals) {
          totals[cat] += amountPerCategory;
        }
      });
    });

    return totals;
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Status Summary Cards - Compact & Professional */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { id: "processing", label: "Processing", color: "blue", count: countByStatus("processing"), total: totalsByStatus.processing },
          { id: "paid", label: "Paid", color: "green", count: countByStatus("paid"), total: totalsByStatus.paid },
          { id: "cancelled", label: "Cancelled", color: "red", count: countByStatus("cancelled"), total: totalsByStatus.cancelled },
        ].map((stat) => (
          <div
            key={stat.id}
            onClick={() => setStatusFilter(statusFilter === stat.id ? "__all" : stat.id)}
            className={`
              relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-all cursor-pointer hover:shadow-md
              ${statusFilter === stat.id ? `ring-2 ring-${stat.color}-500/20 bg-${stat.color}-50/50` : "hover:bg-accent/50"}
            `}
          >
            <div className="flex justify-between items-start mb-2">
              <span className={`text-sm font-medium text-${stat.color}-600 capitalize`}>{stat.label}</span>
              <Badge variant={statusFilter === stat.id ? "default" : "secondary"} className={`bg-${stat.color}-100 text-${stat.color}-700 hover:bg-${stat.color}-200`}>
                {stat.count}
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold tracking-tight">
                ₱{stat.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            {statusFilter === stat.id && (
              <div className={`absolute bottom-0 left-0 h-1 w-full bg-${stat.color}-500`} />
            )}
          </div>
        ))}

        {/* Total / Filtered Total Card */}
        <div className="relative overflow-hidden rounded-xl border bg-slate-900 text-slate-50 p-4 shadow-md">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-medium text-slate-300">
              {statusFilter === "__all" && categoryFilter.length === 0 ? "Grand Total" : "Filtered Total"}
            </span>
            <Filter className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold tracking-tight">
            ₱{(() => {
              let filtered = data;
              if (statusFilter !== "__all") filtered = filtered.filter(item => item.status === statusFilter);
              if (categoryFilter.length > 0) filtered = filtered.filter(item => {
                const itemCategories = item.categories || [];
                return categoryFilter.some(cat => itemCategories.includes(cat));
              });
              const total = filtered.reduce((sum, item) => sum + (item.total || 0), 0);
              return total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            })()}
          </div>
          <div className="mt-1 text-xs text-slate-400 truncate">
            {statusFilter === "__all" && categoryFilter.length === 0
              ? "All Records"
              : `${statusFilter !== "__all" ? statusFilter : "All"} • ${categoryFilter.length ? categoryFilter.join(", ") : "All Categories"}`}
          </div>
        </div>
      </div>

      {/* Control Toolbar: Search, Filters, Navigation */}
      <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-sm">

        {/* Top Row: Search & Pagination Controls */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search charge slips..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <span className="text-sm text-muted-foreground whitespace-nowrap hidden sm:inline-block">Rows:</span>
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(value) => setPagination({ pageIndex: 0, pageSize: Number(value) })}
            >
              <SelectTrigger className="w-16 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center border rounded-md bg-background">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-none rounded-l-md border-r"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-none border-r"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center justify-center min-w-[3rem] px-2 text-sm font-medium">
                {pagination.pageIndex + 1} / {table.getPageCount() || 1}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-none border-l"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-none rounded-r-md border-l"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Row: Category Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
          <span className="text-xs font-semibold text-muted-foreground uppercase mr-2">Filters:</span>
          {VALID_CATEGORIES.map((cat) => {
            const isActive = categoryFilter.includes(cat);
            const catTotal = totalsByCategory[cat] || 0;

            // Define colors
            const colors = {
              laboratory: "purple",
              equipment: "orange",
              bioinformatics: "cyan",
              retail: "pink",
              training: "indigo",
            }[cat] || "gray";

            return (
              <div
                key={cat}
                onClick={() => {
                  isActive
                    ? setCategoryFilter((prev) => prev.filter((c) => c !== cat))
                    : setCategoryFilter((prev) => [...prev, cat]);
                }}
                className={`
                  group flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-all cursor-pointer select-none
                  ${isActive
                    ? `bg-${colors}-50 border-${colors}-200 text-${colors}-700 ring-1 ring-${colors}-500/20`
                    : "bg-background hover:bg-muted/50 text-muted-foreground hover:text-foreground"}
                `}
              >
                <div className={`h-2 w-2 rounded-full bg-${colors}-500 ${!isActive && "opacity-50 group-hover:opacity-100"}`} />
                <span className="capitalize">{cat}</span>
                <span className={`text-xs ml-1 ${isActive ? `text-${colors}-600/80` : "text-muted-foreground"}`}>
                  (₱{(catTotal / 1000).toFixed(0)}k)
                </span>
              </div>
            );
          })}
          {categoryFilter.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setCategoryFilter([])} className="text-xs h-7 ml-auto text-muted-foreground hover:text-foreground">
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-b">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-10 text-xs font-semibold tracking-wide text-muted-foreground uppercase py-3">
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
                  className="hover:bg-muted/30 cursor-pointer transition-colors border-b last:border-0"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3 text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="rounded-full bg-muted/50 p-3">
                      <Search className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                    <p>No charge slips found matching your filters.</p>
                    <Button variant="link" onClick={() => { setGlobalFilter(""); setStatusFilter("__all"); setCategoryFilter([]); }}>
                      Clear all filters
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer / Pagination */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground px-1">
        <div>
          Showing <span className="font-medium text-foreground">{table.getRowModel().rows.length > 0 ? (pagination.pageIndex * pagination.pageSize + 1) : 0}</span> to{" "}
          <span className="font-medium text-foreground">{Math.min((pagination.pageIndex + 1) * pagination.pageSize, filteredData.length)}</span> of{" "}
          <span className="font-medium text-foreground">{filteredData.length}</span> results
        </div>

        {/* Footer Pagination (Simple) */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-xs font-medium">
            Page {pagination.pageIndex + 1}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}