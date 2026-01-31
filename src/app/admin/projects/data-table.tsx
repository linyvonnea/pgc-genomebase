"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
  getPaginationRowModel,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { Project } from "@/types/Project";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronsLeft, ChevronsRight, Filter, X } from "lucide-react";

// Props for the generic DataTable component
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  meta?: { onSuccess?: () => void };
}

// Helper to parse the MM-DD-YYYY string into a Date
const parseDate = (dateStr?: string) => {
  if (!dateStr) return null;
  const [m, d, y] = dateStr.split("-").map(Number);
  if (isNaN(m) || isNaN(d) || isNaN(y)) return null;
  return new Date(y, m - 1, d);
};

export function DataTable<TData extends Project, TValue>({
  columns,
  data,
  meta,
}: DataTableProps<TData, TValue>) {
  // State for search, cards, and date filters
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("__all");
  const [institutionFilter, setInstitutionFilter] = useState<string[]>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [yearFilter, setYearFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Derive available years
  const availableYears = useMemo(() => {
    const fixedRange = [2020, 2021, 2022, 2023, 2024, 2025];
    const dataYears = data.map(item => {
      const d = parseDate(item.startDate);
      return d ? d.getFullYear() : null;
    }).filter(Boolean) as number[];

    return Array.from(new Set([...fixedRange, ...dataYears])).sort((a, b) => b - a);
  }, [data]);

  // Main filtering logic
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // 1. Text Search
      const q = globalFilter.trim().toLowerCase();
      const haystack = `${item.pid || ""} ${item.title || ""} ${item.lead || ""} ${item.personnelAssigned || ""} ${item.sendingInstitution || ""}`.toLowerCase();
      const matchesSearch = q === "" || haystack.includes(q);

      // 2. Status Filter
      const matchesStatus = statusFilter === "__all" || item.status === statusFilter;

      // 3. Institution Filter
      const matchesInstitution =
        institutionFilter.length === 0 ||
        (item.sendingInstitution && institutionFilter.includes(item.sendingInstitution));

      // 4. Date Filters
      const date = parseDate(item.startDate);
      const matchesYear = yearFilter === "all" || (date && date.getFullYear().toString() === yearFilter);
      const matchesMonth = monthFilter === "all" || (date && (date.getMonth() + 1).toString() === monthFilter);

      return matchesSearch && matchesStatus && matchesInstitution && matchesYear && matchesMonth;
    });
  }, [data, globalFilter, statusFilter, institutionFilter, yearFilter, monthFilter]);

  // Reset to first page when filtering
  const prevFilterRef = useState({ globalFilter, statusFilter, institutionFilter, yearFilter, monthFilter })[0];
  if (
    prevFilterRef.globalFilter !== globalFilter ||
    prevFilterRef.statusFilter !== statusFilter ||
    JSON.stringify(prevFilterRef.institutionFilter) !== JSON.stringify(institutionFilter) ||
    prevFilterRef.yearFilter !== yearFilter ||
    prevFilterRef.monthFilter !== monthFilter
  ) {
    prevFilterRef.globalFilter = globalFilter;
    prevFilterRef.statusFilter = statusFilter;
    prevFilterRef.institutionFilter = institutionFilter;
    prevFilterRef.yearFilter = yearFilter;
    prevFilterRef.monthFilter = monthFilter;
    setPagination(p => ({ ...p, pageIndex: 0 }));
  }

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: false,
  });

  // Card Definitions
  const statuses = [
    { id: "Ongoing", label: "Ongoing", color: "text-yellow-600", border: "border-yellow-200", bg: "bg-yellow-50" },
    { id: "Completed", label: "Completed", color: "text-green-600", border: "border-green-200", bg: "bg-green-50" },
    { id: "Cancelled", label: "Cancelled", color: "text-red-600", border: "border-red-200", bg: "bg-red-50" },
  ];

  const institutions = [
    { id: "UP System", label: "UP System", color: "text-blue-600", border: "border-blue-200", bg: "bg-blue-50" },
    { id: "SUC/HEI", label: "SUC/HEI", color: "text-green-600", border: "border-green-200", bg: "bg-green-50" },
    { id: "Government", label: "Government", color: "text-indigo-600", border: "border-indigo-200", bg: "bg-indigo-50" },
    { id: "Private/Local", label: "Private/Local", color: "text-purple-600", border: "border-purple-200", bg: "bg-purple-50" },
  ];

  return (
    <div className="space-y-4">
      {/* Cards Section */}
      <div className="flex flex-col space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                  {data.filter(i => i.status === stat.id).length}
                </div>
                <div className="text-sm text-muted-foreground font-medium">{stat.label}</div>
              </div>
            );
          })}

          <div
            onClick={() => {
              setGlobalFilter("");
              setStatusFilter("__all");
              setInstitutionFilter([]);
              setYearFilter("all");
              setMonthFilter("all");
            }}
            className={`rounded-lg border p-4 cursor-pointer transition-all hover:shadow-md ${statusFilter === "__all" && institutionFilter.length === 0 && globalFilter === "" && yearFilter === "all" && monthFilter === "all"
              ? "ring-2 ring-primary ring-offset-2 bg-slate-50 border-slate-200"
              : "bg-white"
              }`}
          >
            <div className="text-2xl font-bold text-gray-700">{filteredData.length}</div>
            <div className="text-sm text-muted-foreground flex justify-between items-center font-medium">
              <span>Total Projects</span>
              {(statusFilter !== "__all" || institutionFilter.length > 0 || globalFilter !== "" || yearFilter !== "all" || monthFilter !== "all") && (
                <Badge variant="secondary" className="text-[10px] h-4 py-0 leading-none">Active</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {institutions.map((inst) => {
            const isActive = institutionFilter.includes(inst.id);
            return (
              <div
                key={inst.id}
                onClick={() => {
                  if (isActive) {
                    setInstitutionFilter(institutionFilter.filter(i => i !== inst.id));
                  } else {
                    setInstitutionFilter([...institutionFilter, inst.id]);
                  }
                }}
                className={`rounded-lg border p-4 cursor-pointer transition-all hover:shadow-md ${isActive
                  ? `ring-2 ring-primary ring-offset-2 ${inst.bg} ${inst.border}`
                  : "bg-white"
                  }`}
              >
                <div className={`text-2xl font-bold ${inst.color}`}>
                  {data.filter(i => i.sendingInstitution === inst.id).length}
                </div>
                <div className="text-sm text-muted-foreground font-medium">{inst.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Filter Chips */}
      {(statusFilter !== "__all" || institutionFilter.length > 0 || yearFilter !== "all" || monthFilter !== "all") && (
        <div className="flex flex-wrap gap-2 items-center px-1">
          <span className="text-xs font-semibold text-muted-foreground mr-1">Active Filters:</span>
          {statusFilter !== "__all" && (
            <Badge variant="outline" className="flex items-center gap-1 pl-2 pr-1 py-1 bg-amber-50/50 border-amber-200 text-amber-700">
              <span className="text-[10px] uppercase opacity-60 font-bold mr-1">Status</span>
              {statusFilter}
              <Button variant="ghost" size="sm" className="h-4 w-4 p-0 hover:bg-transparent hover:text-red-500" onClick={() => setStatusFilter("__all")}><X className="h-3 w-3" /></Button>
            </Badge>
          )}
          {yearFilter !== "all" && (
            <Badge variant="outline" className="flex items-center gap-1 pl-2 pr-1 py-1 bg-blue-50/50 border-blue-200 text-blue-700">
              <span className="text-[10px] uppercase opacity-60 font-bold mr-1">Year</span>
              {yearFilter}
              <Button variant="ghost" size="sm" className="h-4 w-4 p-0 hover:bg-transparent hover:text-red-500" onClick={() => setYearFilter("all")}><X className="h-3 w-3" /></Button>
            </Badge>
          )}
          {monthFilter !== "all" && (
            <Badge variant="outline" className="flex items-center gap-1 pl-2 pr-1 py-1 bg-green-50/50 border-green-200 text-green-700">
              <span className="text-[10px] uppercase opacity-60 font-bold mr-1">Month</span>
              {monthNames[parseInt(monthFilter) - 1]}
              <Button variant="ghost" size="sm" className="h-4 w-4 p-0 hover:bg-transparent hover:text-red-500" onClick={() => setMonthFilter("all")}><X className="h-3 w-3" /></Button>
            </Badge>
          )}
          {institutionFilter.map(inst => (
            <Badge key={inst} variant="outline" className="flex items-center gap-1 pl-2 pr-1 py-1 bg-purple-50/50 border-purple-200 text-purple-700">
              {inst}
              <Button variant="ghost" size="sm" className="h-4 w-4 p-0 hover:bg-transparent hover:text-red-500" onClick={() => setInstitutionFilter(institutionFilter.filter(i => i !== inst))}><X className="h-3 w-3" /></Button>
            </Badge>
          ))}
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors" onClick={() => {
            setStatusFilter("__all");
            setInstitutionFilter([]);
            setYearFilter("all");
            setMonthFilter("all");
          }}>Clear all</Button>
        </div>
      )}

      {/* Navigation Controls Row */}
      <div className="flex flex-wrap items-end justify-between gap-4 pt-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Search</span>
            <Input
              placeholder="Search projects..."
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
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}><ChevronsLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Prev</Button>
              <div className="flex items-center justify-center min-w-[80px] text-sm font-medium"> {pagination.pageIndex + 1} / {table.getPageCount() || 1} </div>
              <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}><ChevronsRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-hidden bg-white">
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
                      style={{ width: header.getSize(), minWidth: header.getSize() }}
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
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} style={{ width: cell.column.getSize(), minWidth: cell.column.getSize() }}>
                      {flexRender(cell.column.columnDef.cell, { ...cell.getContext(), meta })}
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
                    <Button variant="link" onClick={() => {
                      setStatusFilter("__all");
                      setInstitutionFilter([]);
                      setGlobalFilter("");
                      setYearFilter("all");
                      setMonthFilter("all");
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
