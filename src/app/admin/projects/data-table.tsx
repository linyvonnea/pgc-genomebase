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
import { ChevronsLeft, ChevronsRight, Filter, X, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";

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
  const [serviceRequestedFilter, setServiceRequestedFilter] = useState<string[]>([]);
  const [fundingCategoryFilter, setFundingCategoryFilter] = useState<string[]>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [yearFilter, setYearFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(false);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Filter summary label (Laboratory+2026+January style)
  const filterSummaryLabel = useMemo(() => {
    const filters = [];
    if (statusFilter !== "__all") filters.push(statusFilter);
    if (yearFilter !== "all") filters.push(yearFilter);
    if (monthFilter !== "all") {
      const m = monthNames[parseInt(monthFilter) - 1];
      if (m) filters.push(m);
    }
    if (institutionFilter.length > 0) filters.push(...institutionFilter);
    if (serviceRequestedFilter.length > 0) filters.push(...serviceRequestedFilter);
    if (fundingCategoryFilter.length > 0) filters.push(...fundingCategoryFilter);
    return filters.length > 0 ? filters.join("+") : "All";
  }, [statusFilter, yearFilter, monthFilter, institutionFilter, serviceRequestedFilter, fundingCategoryFilter, monthNames]);

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
        institutionFilter.some(f => {
          if (f === "__blank__") {
            return !item.sendingInstitution || item.sendingInstitution.trim() === "";
          }
          return item.sendingInstitution === f;
        });

      // 4. Service Requested Filter
      const matchesServiceRequested =
        serviceRequestedFilter.length === 0 ||
        serviceRequestedFilter.some(f => {
          const services = Array.isArray(item.serviceRequested)
            ? item.serviceRequested
            : item.serviceRequested ? [item.serviceRequested] : [];
          return services.includes(f);
        });

      // 5. Funding Category Filter
      const matchesFundingCategory =
        fundingCategoryFilter.length === 0 ||
        fundingCategoryFilter.includes(item.fundingCategory || "");

      // 6. Date Filters
      const date = parseDate(item.startDate);
      const matchesYear =
        yearFilter === "all" ||
        (date && date.getFullYear().toString() === yearFilter) ||
        (!item.startDate && yearFilter === "all");
      const matchesMonth =
        monthFilter === "all" ||
        (date && (date.getMonth() + 1).toString() === monthFilter) ||
        (!item.startDate && monthFilter === "all");

      return matchesSearch && matchesStatus && matchesInstitution && matchesServiceRequested && matchesFundingCategory && matchesYear && matchesMonth;
    });
  }, [data, globalFilter, statusFilter, institutionFilter, serviceRequestedFilter, fundingCategoryFilter, yearFilter, monthFilter]);
  // Service Requested and Funding Category card definitions
  const serviceRequestedOptions = [
    { id: "Laboratory Services", label: "Laboratory Services", color: "text-blue-600", border: "border-blue-200", bg: "bg-blue-50" },
    { id: "Retail Sales", label: "Retail Sales", color: "text-green-600", border: "border-green-200", bg: "bg-green-50" },
    { id: "Equipment Use", label: "Equipment Use", color: "text-purple-600", border: "border-purple-200", bg: "bg-purple-50" },
    { id: "Bioinformatics Analysis", label: "Bioinformatics Analysis", color: "text-indigo-600", border: "border-indigo-200", bg: "bg-indigo-50" },
    { id: "Training", label: "Training", color: "text-orange-600", border: "border-orange-200", bg: "bg-orange-50" },
  ];

  const fundingCategoryOptions = [
    { id: "In-House", label: "In-House", color: "text-cyan-600", border: "border-cyan-200", bg: "bg-cyan-50" },
    { id: "External", label: "External", color: "text-emerald-600", border: "border-emerald-200", bg: "bg-emerald-50" },
  ];

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
  // Dynamic counts from Firestore data
  const statusCounts = {
    Ongoing: data.filter(i => i.status === "Ongoing").length,
    Completed: data.filter(i => i.status === "Completed").length,
    Cancelled: data.filter(i => i.status === "Cancelled").length,
  };
  const statuses = [
    { id: "Ongoing", label: "Ongoing", color: "text-yellow-600", border: "border-yellow-200", bg: "bg-yellow-50", count: statusCounts.Ongoing },
    { id: "Completed", label: "Completed", color: "text-green-600", border: "border-green-200", bg: "bg-green-50", count: statusCounts.Completed },
    { id: "Cancelled", label: "Cancelled", color: "text-red-600", border: "border-red-200", bg: "bg-red-50", count: statusCounts.Cancelled },
  ];

  const institutions = [
    { id: "UP System", label: "UP System", color: "text-blue-600", border: "border-blue-200", bg: "bg-blue-50" },
    { id: "SUC/HEI", label: "SUC/HEI", color: "text-green-600", border: "border-green-200", bg: "bg-green-50" },
    { id: "Government", label: "Government", color: "text-indigo-600", border: "border-indigo-200", bg: "bg-indigo-50" },
    { id: "Private/Local", label: "Private/Local", color: "text-purple-600", border: "border-purple-200", bg: "bg-purple-50" },
    { id: "International", label: "International", color: "text-orange-600", border: "border-orange-200", bg: "bg-orange-50" },
    { id: "N/A", label: "N/A", color: "text-gray-600", border: "border-gray-200", bg: "bg-gray-50" },
      // ...existing code...
  ];

  return (
    <div className="space-y-4">
      {/* Filters & Overview Section */}
      <Card className="overflow-hidden">
        <div 
          className="flex items-center justify-between px-3 py-2 border-b cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setIsFiltersCollapsed(!isFiltersCollapsed)}
        >
          <h3 className="text-base font-bold text-gray-800">Filters & Overview</h3>
          <ChevronDown className={`h-4 w-4 transition-transform ${isFiltersCollapsed ? 'rotate-180' : ''}`} />
        </div>
        
        {!isFiltersCollapsed && (
          <div className="space-y-0.5">
            {/* Institution Cards Section */}
            <div className="bg-gray-50 rounded p-1 space-y-0.5 border border-gray-200">
              <h4 className="text-[10px] font-bold text-gray-800 uppercase tracking-wider">Institution Type</h4>
              <div className="grid grid-cols-4 gap-1 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7">
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
                      className={`rounded border px-1.5 py-1 cursor-pointer transition-all duration-200 w-full shadow-sm hover:shadow-md active:scale-95 ${
                        isActive
                          ? `${inst.bg} ${inst.border} font-semibold ${inst.color}`
                          : "bg-white border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                      }`}
                    >
                      <div className="text-[8px] font-semibold text-center">
                        {inst.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Service Requested Cards Section */}
            <div className="bg-gray-50 rounded p-1 space-y-0.5 border border-gray-200">
              <h4 className="text-[10px] font-bold text-gray-800 uppercase tracking-wider">Service Requested</h4>
              <div className="grid grid-cols-4 gap-1 sm:grid-cols-5 md:grid-cols-6">
                {serviceRequestedOptions.map((service) => {
                  const isActive = serviceRequestedFilter.includes(service.id);
                  return (
                    <div
                      key={service.id}
                      onClick={() => {
                        if (isActive) {
                          setServiceRequestedFilter(serviceRequestedFilter.filter(s => s !== service.id));
                        } else {
                          setServiceRequestedFilter([...serviceRequestedFilter, service.id]);
                        }
                      }}
                      className={`rounded border px-1.5 py-1 cursor-pointer transition-all duration-200 w-full shadow-sm hover:shadow-md active:scale-95 ${
                        isActive
                          ? `${service.bg} ${service.border} font-semibold ${service.color}`
                          : "bg-white border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                      }`}
                    >
                      <div className="text-[8px] font-semibold text-center">
                        {service.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status Cards Section */}
            <div className="bg-gray-50 rounded p-1 space-y-0.5 border border-gray-200">
              <h4 className="text-[10px] font-bold text-gray-800 uppercase tracking-wider">Project Status</h4>
              <div className="flex gap-1">
                {statuses.map((stat) => {
                  const isActive = statusFilter === stat.id;
                  return (
                    <div
                      key={stat.id}
                      onClick={() => setStatusFilter(isActive ? "__all" : stat.id)}
                      className={`rounded border px-2 py-1 flex-1 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 ${
                        isActive
                          ? `${stat.bg} ${stat.border} font-semibold ${stat.color}`
                          : "bg-white border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                      }`}
                    >
                      <div className="text-[9px] font-semibold text-center">
                        {stat.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Funding Category Cards Section */}
            <div className="bg-gray-50 rounded p-1 space-y-0.5 border border-gray-200">
              <h4 className="text-[10px] font-bold text-gray-800 uppercase tracking-wider">Funding Category</h4>
              <div className="flex gap-1">
                {fundingCategoryOptions.map((funding) => {
                  const isActive = fundingCategoryFilter.includes(funding.id);
                  return (
                    <div
                      key={funding.id}
                      onClick={() => {
                        if (isActive) {
                          setFundingCategoryFilter(fundingCategoryFilter.filter(f => f !== funding.id));
                        } else {
                          setFundingCategoryFilter([...fundingCategoryFilter, funding.id]);
                        }
                      }}
                      className={`rounded border px-2 py-1 flex-1 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 ${
                        isActive
                          ? `${funding.bg} ${funding.border} font-semibold ${funding.color}`
                          : "bg-white border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                      }`}
                    >
                      <div className="text-[9px] font-semibold text-center">
                        {funding.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Search & Date Filters with Summary Card */}
            <div className="bg-gray-50 rounded p-1 space-y-0.5 border border-gray-200">
              <div className="flex flex-wrap items-end gap-1">
                <div className="w-1/4 min-w-[80px]">
                  <Input
                    placeholder="Search"
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    className="h-7 text-xs w-full"
                  />
                </div>

                <div>
                  <Select value={yearFilter} onValueChange={setYearFilter}>
                    <SelectTrigger className="w-[110px] h-7 text-[10px]">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {availableYears.map(y => (
                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Select value={monthFilter} onValueChange={setMonthFilter}>
                    <SelectTrigger className="w-[120px] h-7 text-[10px]">
                      <SelectValue placeholder="Month" />
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
                      setGlobalFilter("");
                      setStatusFilter("__all");
                      setInstitutionFilter([]);
                      setServiceRequestedFilter([]);
                      setFundingCategoryFilter([]);
                      setYearFilter("all");
                      setMonthFilter("all");
                    }}
                    className={`rounded border px-1 py-0.5 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 w-[230px] text-xs ${
                      statusFilter === "__all" && 
                      institutionFilter.length === 0 && 
                      serviceRequestedFilter.length === 0 && 
                      fundingCategoryFilter.length === 0 && 
                      globalFilter === "" && 
                      yearFilter === "all" && 
                      monthFilter === "all"
                        ? "bg-white border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                        : "bg-gradient-to-br from-blue-500 to-indigo-600 border-indigo-700 text-white font-semibold"
                    }`}
                  >
                    <div className="space-y-0">
                      <div className="text-[7px] font-semibold uppercase tracking-wide opacity-90 leading-none">
                        Results
                      </div>
                      <div className="text-base font-bold leading-none">
                        {filteredData.length}
                      </div>
                      <div className="text-[6px] font-medium truncate opacity-80 leading-none">
                        {filterSummaryLabel !== 'All' ? filterSummaryLabel : 'All'}
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
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            &laquo;
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
            &raquo;
          </Button>
        </div>
      </div>

      {/* Compact Table with Sticky Header */}
      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur-sm z-10">
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
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        style={{ width: cell.column.getSize(), minWidth: cell.column.getSize() }}
                        className="py-2"
                      >
                        {flexRender(cell.column.columnDef.cell, { ...cell.getContext(), meta })}
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
      </div>

      {/* Bottom Pagination */}
      <div className="flex items-center justify-end">
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
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            &laquo;
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
            &raquo;
          </Button>
        </div>
      </div>
    </div>
  );
}
