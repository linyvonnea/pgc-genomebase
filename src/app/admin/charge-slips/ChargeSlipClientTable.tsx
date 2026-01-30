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
import { Filter, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
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
    <div className="space-y-8">
      {/* Top Section: Search Box (Top Left of Category Cards) */}
      <div className="flex flex-col xl:flex-row gap-6 items-start xl:items-center justify-between">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
          <Input
            placeholder="Search charge slips, clients, or projects..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10 h-11 bg-card shadow-sm border-muted-foreground/20 focus-visible:ring-primary/20"
          />
        </div>

        {/* Category Filters (Pills) */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-1">Filter by Category:</span>
          {VALID_CATEGORIES.map((cat) => {
            const isActive = categoryFilter.includes(cat);
            const catTotal = totalsByCategory[cat] || 0;
            const colors = {
              laboratory: "purple",
              equipment: "orange",
              bioinformatics: "cyan",
              retail: "pink",
              training: "indigo",
            }[cat] || "gray";

            return (
              <Button
                key={cat}
                variant="outline"
                size="sm"
                onClick={() => {
                  isActive
                    ? setCategoryFilter((prev) => prev.filter((c) => c !== cat))
                    : setCategoryFilter((prev) => [...prev, cat]);
                }}
                className={`
                  h-9 rounded-full px-4 text-xs font-semibold transition-all border-dashed
                  ${isActive
                    ? `bg-${colors}-50 border-${colors}-400 text-${colors}-700 ring-4 ring-${colors}-500/10`
                    : "bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground"}
                `}
              >
                <div className={`h-1.5 w-1.5 rounded-full mr-2 bg-${colors}-500 ${!isActive && "opacity-50"}`} />
                <span className="capitalize">{cat}</span>
                <span className="ml-2 text-[10px] opacity-60">₱{(catTotal / 1000).toFixed(0)}k</span>
              </Button>
            );
          })}
          {categoryFilter.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setCategoryFilter([])} className="h-9 px-3 text-xs text-destructive hover:text-destructive hover:bg-destructive/5">
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { id: "processing", label: "Processing", color: "blue", count: countByStatus("processing"), total: totalsByStatus.processing },
          { id: "paid", label: "Paid", color: "green", count: countByStatus("paid"), total: totalsByStatus.paid },
          { id: "cancelled", label: "Cancelled", color: "red", count: countByStatus("cancelled"), total: totalsByStatus.cancelled },
        ].map((stat) => (
          <div
            key={stat.id}
            onClick={() => setStatusFilter(statusFilter === stat.id ? "__all" : stat.id)}
            className={`
              group relative overflow-hidden rounded-2xl border p-5 shadow-sm transition-all cursor-pointer hover:shadow-md
              ${statusFilter === stat.id ? `border-${stat.color}-500 bg-${stat.color}-50/50 ring-1 ring-${stat.color}-500` : "bg-card border-muted/50 hover:border-muted-foreground/50"}
            `}
          >
            <div className="flex justify-between items-start mb-3">
              <div className={`p-2 rounded-lg bg-${stat.color}-100/50 text-${stat.color}-600`}>
                <span className="text-[10px] font-bold uppercase tracking-wider">{stat.label}</span>
              </div>
              <Badge variant={statusFilter === stat.id ? "default" : "secondary"} className={`text-[10px] h-5 rounded-md`}>
                {stat.count}
              </Badge>
            </div>
            <div className="text-2xl font-bold tracking-tight">
              ₱{stat.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={`absolute bottom-0 left-0 h-1 transition-all duration-300 ${statusFilter === stat.id ? "w-full" : "w-0"} bg-${stat.color}-500`} />
          </div>
        ))}

        {/* Total Summary Card */}
        <div className="relative overflow-hidden rounded-2xl border bg-slate-900 border-slate-800 text-slate-50 p-5 shadow-sm group">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {statusFilter === "__all" && categoryFilter.length === 0 ? "Grand Total" : "Filtered Total"}
              </span>
            </div>
            <Filter className={`h-4 w-4 transition-colors ${statusFilter !== "__all" || categoryFilter.length > 0 ? "text-primary" : "text-slate-500"}`} />
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
          <p className="text-[10px] text-slate-500 mt-2 truncate font-medium">
            {statusFilter === "__all" && categoryFilter.length === 0
              ? "Total based on all recorded entries"
              : `${statusFilter !== "__all" ? statusFilter.toUpperCase() : "ALL"} • ${categoryFilter.length ? categoryFilter.join(", ").toUpperCase() : "ALL CATEGORIES"}`}
          </p>
        </div>
      </div>

      {/* Main Table Context Container */}
      <div className="space-y-4">

        {/* Table Header Toolbar: Showing Results (Left) and Navigation (Right) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1">
          <div className="text-sm font-medium text-muted-foreground order-2 sm:order-1">
            Showing <span className="text-foreground">{table.getRowModel().rows.length > 0 ? (pagination.pageIndex * pagination.pageSize + 1) : 0}</span> to{" "}
            <span className="text-foreground">{Math.min((pagination.pageIndex + 1) * pagination.pageSize, filteredData.length)}</span> of{" "}
            <span className="text-foreground font-bold">{filteredData.length}</span> results
          </div>

          <div className="flex items-center gap-4 order-1 sm:order-2">
            {/* Rows Per Page */}
            <div className="hidden lg:flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Rows per page:</span>
              <Select
                value={String(pagination.pageSize)}
                onValueChange={(value) => setPagination({ pageIndex: 0, pageSize: Number(value) })}
              >
                <SelectTrigger className="w-[70px] h-8 text-xs border-muted/50">
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

            {/* Navigation Bar (Top Right of Table) */}
            <div className="flex items-center bg-card border border-muted/50 rounded-lg shadow-sm overflow-hidden">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-none border-r border-muted/30 disabled:opacity-30"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-none border-r border-muted/30 disabled:opacity-30"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="px-4 text-[11px] font-bold text-muted-foreground bg-muted/5">
                {pagination.pageIndex + 1} / {table.getPageCount() || 1}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-none border-l border-muted/30 disabled:opacity-30"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-none border-l border-muted/30 disabled:opacity-30"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* The Data Table */}
        <div className="rounded-xl border border-muted/60 bg-card shadow-sm overflow-hidden relative">
          <Table>
            <TableHeader className="bg-muted/30">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent border-b border-muted/60">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="h-11 text-[10px] font-bold tracking-wider text-muted-foreground uppercase py-3 whitespace-nowrap">
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
                    className="group hover:bg-muted/40 cursor-pointer transition-colors border-b border-muted/40 last:border-0"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-3.5 text-sm font-medium">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-72 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="rounded-full bg-muted/50 p-5 ring-8 ring-muted/20">
                        <Search className="h-10 w-10 text-muted-foreground/40" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-base font-bold text-foreground">No matches found</p>
                        <p className="text-sm">We couldn't find any charge slips matching your current filters.</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setGlobalFilter(""); setStatusFilter("__all"); setCategoryFilter([]); }}
                        className="mt-2 rounded-full px-6"
                      >
                        Reset all parameters
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile-only bottom results summary */}
      <div className="flex sm:hidden justify-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">
        End of results
      </div>
    </div>
  );
}