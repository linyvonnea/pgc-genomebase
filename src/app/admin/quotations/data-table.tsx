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
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Derive available years from data + 2020-2025 range
  const availableYears = useMemo(() => {
    const fixedRange = [2020, 2021, 2022, 2023, 2024, 2025];
    const dataYears = data.map((item: any) => {
      const d = item.dateIssued ? new Date(item.dateIssued) : null;
      return d && !isNaN(d.getTime()) ? d.getFullYear() : null;
    }).filter(Boolean) as number[];

    return Array.from(new Set([...fixedRange, ...dataYears])).sort((a, b) => b - a);
  }, [data]);

  // 1) Apply your filters FIRST
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
        categoryFilter.some((cat) =>
          recordCats.some(c => c?.toLowerCase() === cat.toLowerCase())
        );

      // year and month filter
      const date = row.dateIssued ? new Date(row.dateIssued) : null;
      const matchesYear = yearFilter === "all" || (date && date.getFullYear().toString() === yearFilter);
      const matchesMonth = monthFilter === "all" || (date && (date.getMonth() + 1).toString() === monthFilter);

      return matchesSearch && matchesCategory && matchesYear && matchesMonth;
    });
  }, [data, globalFilter, categoryFilter, yearFilter, monthFilter]);

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
    { name: "Laboratory", color: "text-green-600", border: "border-green-200", bg: "bg-green-50" },
    { name: "Equipment", color: "text-blue-600", border: "border-blue-200", bg: "bg-blue-50" },
    { name: "Bioinformatics", color: "text-purple-600", border: "border-purple-200", bg: "bg-purple-50" },
    { name: "Retail", color: "text-orange-600", border: "border-orange-200", bg: "bg-orange-50" },
    { name: "Training", color: "text-indigo-600", border: "border-indigo-200", bg: "bg-indigo-50" },
  ];

  const countByCategory = (catName: string) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data.filter((q: any) =>
      (q.categories || []).some((c: string) => c.toLowerCase() === catName.toLowerCase())
    ).length;

  return (
    <div className="space-y-4">
      {/* Stats/Category Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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
              <div className="text-sm text-muted-foreground">{cat.name === "Retail" ? "Retail Sales" : cat.name}</div>
            </div>
          );
        })}
        <div
          onClick={() => {
            setCategoryFilter([]);
            setYearFilter("all");
            setMonthFilter("all");
            setGlobalFilter("");
          }}
          className={`rounded-lg border p-4 cursor-pointer transition-all hover:shadow-md ${categoryFilter.length === 0 && yearFilter === "all" && monthFilter === "all" && globalFilter === ""
            ? "ring-2 ring-primary ring-offset-2 bg-slate-50 border-slate-200"
            : "bg-white"
            }`}
        >
          <div className="text-2xl font-bold text-gray-700">{filteredData.length}</div>
          <div className="text-sm text-muted-foreground flex justify-between items-center">
            <span>Total Quotations</span>
            {(categoryFilter.length > 0 || yearFilter !== "all" || monthFilter !== "all" || globalFilter !== "") && (
              <span className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-full font-medium">Active</span>
            )}
          </div>
        </div>
      </div>

      {/* Active Filter Chips */}
      {(yearFilter !== "all" || monthFilter !== "all" || categoryFilter.length > 0) && (
        <div className="flex flex-wrap gap-2 items-center px-1">
          <span className="text-xs font-semibold text-muted-foreground mr-1">Active Filters:</span>

          {yearFilter !== "all" && (
            <Badge variant="outline" className="flex items-center gap-1 pl-2 pr-1 py-1 bg-blue-50/50 border-blue-200 text-blue-700">
              <span className="text-[10px] uppercase opacity-60 font-bold mr-1">Year</span>
              {yearFilter}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent hover:text-red-500"
                onClick={() => setYearFilter("all")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {monthFilter !== "all" && (
            <Badge variant="outline" className="flex items-center gap-1 pl-2 pr-1 py-1 bg-green-50/50 border-green-200 text-green-700">
              <span className="text-[10px] uppercase opacity-60 font-bold mr-1">Month</span>
              {monthNames[parseInt(monthFilter) - 1]}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent hover:text-red-500"
                onClick={() => setMonthFilter("all")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {categoryFilter.map(cat => {
            const catInfo = categories.find(c => c.name === cat);
            return (
              <Badge
                key={cat}
                variant="outline"
                className={`flex items-center gap-1 pl-2 pr-1 py-1 ${catInfo?.bg || 'bg-slate-50'} ${catInfo?.border || 'border-slate-200'} ${catInfo?.color || 'text-slate-700'}`}
              >
                {cat === "Retail" ? "Retail Sales" : cat}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent hover:text-red-500"
                  onClick={() => setCategoryFilter(categoryFilter.filter(c => c !== cat))}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            );
          })}

          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
            onClick={() => {
              setYearFilter("all");
              setMonthFilter("all");
              setCategoryFilter([]);
            }}
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Header with Search and Date Filters */}
      <div className="flex flex-wrap items-end justify-between gap-4 pt-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Search</span>
            <Input
              placeholder="Search client, institution..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-72 h-9"
            />
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Year</span>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[110px] h-9">
                <SelectValue placeholder="All Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {availableYears.map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Month</span>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue placeholder="All Months" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {monthNames.map((m, idx) => (
                  <SelectItem key={m} value={(idx + 1).toString()}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Rows:</span>
              <Select
                value={String(pagination.pageSize)}
                onValueChange={(v) => table.setPageSize(Number(v))}
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
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort?.();
                  const sortDir = header.column.getIsSorted?.();
                  return (
                    <TableHead
                      key={header.id}
                      onClick={
                        canSort ? header.column.getToggleSortingHandler() : undefined
                      }
                      className={canSort ? "cursor-pointer select-none" : ""}
                    >
                      <div className="flex items-center gap-1">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
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

      <div className="text-xs text-muted-foreground px-1">
        Showing {filteredData.length > 0 ? (pagination.pageIndex * pagination.pageSize) + 1 : 0} - {Math.min((pagination.pageIndex + 1) * pagination.pageSize, filteredData.length)} of {filteredData.length} records
      </div>
    </div>
  );
}