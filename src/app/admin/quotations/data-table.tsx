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
import { useMemo, useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, MoreHorizontal } from "lucide-react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onRowClick?: (rowData: TData) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  // default sort: newest first
  const [sorting, setSorting] = useState<SortingState>([
    { id: "dateIssued", desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  // 1) Apply your filters FIRST
  const filteredData = useMemo(() => {
    const q = globalFilter.trim().toLowerCase();
    return data.filter((row: any) => {
      // text search across visible fields
      const haystack =
        `${row.referenceNumber || ""} ${row.name || ""} ${row.institution || ""} ${row.designation || ""}`
          .toLowerCase();
      const matchesSearch = q === "" || haystack.includes(q);

      // category filter against row.categories (array of strings)
      const recordCats: string[] = row.categories ?? [];
      const matchesCategory =
        categoryFilter.length === 0 ||
        categoryFilter.some((cat) =>
          recordCats.some(c => c?.toLowerCase() === cat.toLowerCase())
        );

      return matchesSearch && matchesCategory;
    });
  }, [data, globalFilter, categoryFilter]);

  // Reset to first page when filters change
  const prevFilterRef = useState({ globalFilter, categoryFilter })[0];
  if (
    prevFilterRef.globalFilter !== globalFilter ||
    JSON.stringify(prevFilterRef.categoryFilter) !== JSON.stringify(categoryFilter)
  ) {
    prevFilterRef.globalFilter = globalFilter;
    prevFilterRef.categoryFilter = categoryFilter;
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }

  // 2) Give the FILTERED array to TanStack Table
  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: false,
  });

  // Static categories for filtering
  const categories = [
    { name: "Laboratory", color: "purple" },
    { name: "Equipment", color: "orange" },
    { name: "Bioinformatics", color: "cyan" },
    { name: "Retail", color: "pink" },
    { name: "Training", color: "indigo" },
  ];

  const countByCategory = (catName: string) =>
    data.filter((q: any) =>
      (q.categories || []).some((c: string) => c.toLowerCase() === catName.toLowerCase())
    ).length;

  return (
    <div className="space-y-8">
      {/* Top Section: Search and Category Cards */}
      <div className="flex flex-col xl:flex-row gap-6 items-start xl:items-end justify-between">
        <div className="space-y-4 w-full xl:w-auto">
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
            <Input
              placeholder="Search quotation details..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-10 h-11 bg-card shadow-sm border-muted-foreground/20 focus-visible:ring-primary/20"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {categories.map((cat) => {
              const isActive = categoryFilter.includes(cat.name);
              const count = countByCategory(cat.name);
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
                  className={`
                      relative overflow-hidden rounded-xl border p-3 cursor-pointer transition-all hover:shadow-md select-none
                      ${isActive
                      ? `bg-${cat.color}-50 border-${cat.color}-400 ring-1 ring-${cat.color}-500/20`
                      : "bg-card border-muted/60 hover:border-muted-foreground/40"}
                    `}
                >
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? `text-${cat.color}-700` : "text-muted-foreground"}`}>
                      {cat.name === "Retail" ? "Retail" : cat.name}
                    </span>
                    <Badge variant={isActive ? "default" : "secondary"} className="h-4 px-1 text-[9px] min-w-[1.25rem] flex justify-center">
                      {count}
                    </Badge>
                  </div>
                  {isActive && (
                    <div className={`absolute bottom-0 left-0 h-0.5 w-full bg-${cat.color}-500`} />
                  )}
                </div>
              );
            })}

            {/* Total Card Small */}
            <div
              onClick={() => setCategoryFilter([])}
              className={`
                  relative overflow-hidden rounded-xl border p-3 cursor-pointer transition-all hover:shadow-md select-none
                  ${categoryFilter.length === 0
                  ? "bg-slate-900 border-slate-700 text-slate-100"
                  : "bg-card border-muted/60 hover:border-muted-foreground/40"}
                `}
            >
              <div className="flex justify-between items-center">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${categoryFilter.length === 0 ? "text-slate-100" : "text-muted-foreground"}`}>
                  All
                </span>
                <Badge variant={categoryFilter.length === 0 ? "outline" : "secondary"} className={`h-4 px-1 text-[9px] ${categoryFilter.length === 0 && "text-white border-white/50"}`}>
                  {data.length}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="space-y-4">
        {/* Table Toolbar: Showing results (Left) and Navigation (Right) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1">
          <div className="text-sm font-medium text-muted-foreground order-2 sm:order-1">
            Showing <span className="text-foreground">{filteredData.length > 0 ? (pagination.pageIndex * pagination.pageSize) + 1 : 0}</span> to{" "}
            <span className="text-foreground">{Math.min((pagination.pageIndex + 1) * pagination.pageSize, filteredData.length)}</span> of{" "}
            <span className="text-foreground font-bold">{filteredData.length}</span> results
          </div>

          <div className="flex items-center gap-4 order-1 sm:order-2">
            {/* Rows Per Page */}
            <div className="hidden lg:flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Rows:</span>
              <Select
                value={String(pagination.pageSize)}
                onValueChange={(v) => table.setPageSize(Number(v))}
              >
                <SelectTrigger className="w-[70px] h-8 text-xs border-muted/50">
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

        {/* Table Content */}
        <div className="rounded-xl border border-muted/60 bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id} className="hover:bg-transparent border-b border-muted/60">
                  {hg.headers.map((header) => {
                    const canSort = header.column.getCanSort?.();
                    const sortDir = header.column.getIsSorted?.();
                    return (
                      <TableHead
                        key={header.id}
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                        className={`h-11 text-[10px] font-bold tracking-wider text-muted-foreground uppercase py-3 whitespace-nowrap ${canSort ? "cursor-pointer select-none" : ""}`}
                      >
                        <div className="flex items-center gap-1">
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && (
                            <span className="opacity-60">
                              {sortDir === "asc" ? "▲" : sortDir === "desc" ? "▼" : <MoreHorizontal className="h-3 w-3 opacity-20" />}
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
                    onClick={() => onRowClick?.(row.original)}
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
                        <Filter className="h-10 w-10 text-muted-foreground/40" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-base font-bold text-foreground">No matches found</p>
                        <p className="text-sm">We couldn't find any quotations matching your search.</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}