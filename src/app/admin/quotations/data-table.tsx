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
import { ChevronsLeft, ChevronsRight, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

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
  const [yearFilter, setYearFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(false);

  const monthNames = useMemo(() => [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ], []);

  // Derive available years from data + 2020-2025 range
  const availableYears = useMemo(() => {
    const fixedRange = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
    const dataYears = data.map((item: any) => {
      const d = item.dateIssued ? new Date(item.dateIssued) : null;
      return d && !isNaN(d.getTime()) ? d.getFullYear() : null;
    }).filter(Boolean) as number[];

    return Array.from(new Set([...fixedRange, ...dataYears])).sort((a, b) => b - a);
  }, [data]);

  // Filter data manually before passing to table
  const filteredData = useMemo(() => {
    const q = globalFilter.trim().toLowerCase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        categoryFilter.some((cat) => {
          const target = cat === "Retail Sales" ? "Retail" : cat;
          return recordCats.some(c => c?.toLowerCase() === target.toLowerCase());
        });

      // year and month filter
      const date = row.dateIssued ? new Date(row.dateIssued) : null;
      const matchesYear = yearFilter === "all" || (date && date.getFullYear().toString() === yearFilter);
      const matchesMonth = monthFilter === "all" || (date && (date.getMonth() + 1).toString() === monthFilter);

      return matchesSearch && matchesCategory && matchesYear && matchesMonth;
    });
  }, [data, globalFilter, categoryFilter, yearFilter, monthFilter]);

  // Total Summary for the filtered data
  const filteredTotalValue = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return filteredData.reduce((sum, item: any) => sum + (item.total || 0), 0);
  }, [filteredData]);

  // Reset to first page when filters change
  const prevFilterRef = useState({ globalFilter, categoryFilter, yearFilter, monthFilter })[0];
  if (
    prevFilterRef.globalFilter !== globalFilter ||
    JSON.stringify(prevFilterRef.categoryFilter) !== JSON.stringify(categoryFilter) ||
    prevFilterRef.yearFilter !== yearFilter ||
    prevFilterRef.monthFilter !== monthFilter
  ) {
    prevFilterRef.globalFilter = globalFilter;
    prevFilterRef.categoryFilter = categoryFilter;
    prevFilterRef.yearFilter = yearFilter;
    prevFilterRef.monthFilter = monthFilter;
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }

  // Give the FILTERED array to TanStack Table
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
  const categories = useMemo(() => [
    { name: "Laboratory", color: "text-green-600", border: "border-green-200", bg: "bg-green-50" },
    { name: "Equipment", color: "text-blue-600", border: "border-blue-200", bg: "bg-blue-50" },
    { name: "Bioinformatics", color: "text-purple-600", border: "border-purple-200", bg: "bg-purple-50" },
    { name: "Retail Sales", color: "text-orange-600", border: "border-orange-200", bg: "bg-orange-50" },
    { name: "Training", color: "text-indigo-600", border: "border-indigo-200", bg: "bg-indigo-50" },
  ], []);

  // Calculate counts for each category (from the whole database)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    categories.forEach((cat) => {
      const target = cat.name === "Retail Sales" ? "Retail" : cat.name;
      // "Database" count = unfiltered data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      counts[cat.name] = data.filter((item: any) =>
        (item.categories || []).some((c: string) => c.toLowerCase() === target.toLowerCase())
      ).length;
    });
    return counts;
  }, [data, categories]);

  // Active filters label calculation
  const activeFiltersLabel = useMemo(() => {
    const filters = [];
    if (categoryFilter.length > 0) filters.push(...categoryFilter);
    if (yearFilter !== "all") filters.push(yearFilter);
    if (monthFilter !== "all") {
      const mIndex = parseInt(monthFilter) - 1;
      filters.push(monthNames[mIndex]);
    }
    return filters.length > 0 ? filters.join(" + ") : "All Records";
  }, [categoryFilter, yearFilter, monthFilter, monthNames]);

  // Pagination Controls Component
  const PaginationControls = () => {
    return (
      <div className="flex items-center justify-between gap-2">
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
    );
  };

  return (
    <div className="space-y-4">
      {/* Collapsible Filter Section */}
      <Card className="overflow-hidden">
        <div 
          className="flex items-center justify-between px-3 py-2 border-b cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setIsFiltersCollapsed(!isFiltersCollapsed)}
        >
          <h3 className="text-base font-bold text-gray-800">Filters & Overview</h3>
          <ChevronDown className={`h-4 w-4 transition-transform ${isFiltersCollapsed ? 'rotate-180' : ''}`} />
        </div>
        
        {!isFiltersCollapsed && (
          <div className="p-2.5 space-y-2.5">
            {/* Service Categories Section */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Service Categories</label>
              <div className="grid grid-cols-1 gap-1">
                {categories.map((cat) => {
                  const isActive = categoryFilter.includes(cat.name);
                  return (
                    <button
                      key={cat.name}
                      onClick={() => {
                        if (isActive) {
                          setCategoryFilter(categoryFilter.filter((c) => c !== cat.name));
                        } else {
                          setCategoryFilter([...categoryFilter, cat.name]);
                        }
                      }}
                      className={`rounded-md border px-2 py-2 text-[9px] font-medium transition-all duration-200 hover:shadow-sm ${
                        isActive
                          ? `${cat.bg} ${cat.border} font-semibold ${cat.color}`
                          : "bg-white border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Search & Date Filters with Summary Card */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-end gap-2 pb-1">
                <div className="space-y-0.5">
                  <span className="text-[8px] font-bold uppercase text-muted-foreground ml-1">Search</span>
                  <Input
                    placeholder="Search client, institution..."
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    className="w-56 h-7 text-sm"
                  />
                </div>

                <div className="space-y-0.5">
                  <span className="text-[8px] font-bold uppercase text-muted-foreground ml-1">Year</span>
                  <Select value={yearFilter} onValueChange={setYearFilter}>
                    <SelectTrigger className="w-[120px] h-7 text-sm">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {availableYears.map(y => (
                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[8px] font-bold uppercase text-muted-foreground ml-1">Month</span>
                  <Select value={monthFilter} onValueChange={setMonthFilter}>
                    <SelectTrigger className="w-[140px] h-7 text-sm">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Months</SelectItem>
                      {monthNames.map((m, idx) => (
                        <SelectItem key={m} value={(idx + 1).toString()}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Summary Card aligned with filters */}
                <div className="ml-auto">
                  <div
                    onClick={() => {
                      setCategoryFilter([]);
                      setGlobalFilter("");
                      setYearFilter("all");
                      setMonthFilter("all");
                    }}
                    className={`rounded-lg border px-2 py-1.5 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-sm w-[300px] ${
                      categoryFilter.length === 0 && 
                      globalFilter === "" && 
                      yearFilter === "all" && 
                      monthFilter === "all"
                        ? "ring-1 ring-primary ring-offset-1 bg-slate-50 border-slate-200 shadow-sm"
                        : "bg-white hover:bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="text-[13px] text-primary font-medium uppercase tracking-wide">
                        Summary
                      </div>
                      <div className="text-lg font-bold text-gray-800">
                        ₱{filteredTotalValue.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <div className="text-xs text-blue-600 font-semibold">
                          {filteredData.length} {filteredData.length === 1 ? 'result' : 'results'}
                        </div>
                        <div className="text-[10px] font-medium text-gray-500 truncate">
                          {activeFiltersLabel}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
      
      {/* Table Header with Record Count and Navigation */}
      <div className="flex items-center justify-between py-1">
        <div className="text-sm text-muted-foreground">
          Showing {filteredData.length > 0 ? (pagination.pageIndex * pagination.pageSize) + 1 : 0} - {Math.min((pagination.pageIndex + 1) * pagination.pageSize, filteredData.length)} of {filteredData.length} records
        </div>
        <PaginationControls />
      </div>

      {/* Compact Table with Sticky Header */}
      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur-sm z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort?.();
                    const sortDir = header.column.getIsSorted?.();
                    return (
                      <TableHead
                        key={header.id}
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                        className={`${canSort ? "cursor-pointer select-none" : ""} h-10 text-xs font-semibold`}
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
                    onClick={() => onRowClick?.(row.original)}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-2">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center h-24 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2 py-4">
                      <p>No results found for current filters.</p>
                      <Button variant="link" onClick={() => {
                        setCategoryFilter([]);
                        setYearFilter("all");
                        setMonthFilter("all");
                        setGlobalFilter("");
                      }}>Clear all filters</Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Bottom Pagination */}
      <div className="flex items-center justify-end">
        <PaginationControls />
      </div>
    </div>
  );
}