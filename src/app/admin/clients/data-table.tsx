// Admin Clients Data Table
// Generic data table component for displaying and managing client records in the admin panel.
// Supports sorting, filtering, pagination, and custom actions via meta prop.

"use client"

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  ColumnFiltersState,
  getPaginationRowModel,
} from "@tanstack/react-table"
import { useState, useMemo, useEffect } from "react"
// Helper to robustly parse Firestore and ISO date strings
function parseClientDate(dateVal: any): Date | null {
  if (!dateVal) return null;
  
  // If already a valid Date object
  if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
    console.log('📅 Already a Date object:', dateVal.toISOString());
    return dateVal;
  }
  
  // Handle string types (which is what we'll get from the server)
  if (typeof dateVal === 'string') {
    // Try ISO string first (fastest and most reliable)
    // Format: "2026-01-12T14:30:19.000Z"
    const isoDate = new Date(dateVal);
    if (!isNaN(isoDate.getTime())) {
      console.log(`📅 Parsed ISO string: "${dateVal}" -> ${isoDate.toISOString()}`);
      return isoDate;
    }
    
    // Try Firestore display string format: "January 12, 2026 at 2:30:19 PM UTC+8"
    const firestoreMatch = String(dateVal).match(/([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})\s+at\s+(\d{1,2}):(\d{2}):(\d{2})\s+([AP]M)/i);
    if (firestoreMatch) {
      const [, monthName, day, year, hour, minute, second, ampm] = firestoreMatch;
      
      try {
        const monthMap: Record<string, number> = {
          'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
          'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11
        };
        
        const month = monthMap[monthName.toLowerCase()];
        let hours = parseInt(hour, 10);
        
        // Convert to 24-hour format
        if (ampm.toUpperCase() === 'PM' && hours !== 12) {
          hours += 12;
        } else if (ampm.toUpperCase() === 'AM' && hours === 12) {
          hours = 0;
        }
        
        const d = new Date(
          parseInt(year, 10),
          month,
          parseInt(day, 10),
          hours,
          parseInt(minute, 10),
          parseInt(second, 10)
        );
        
        if (!isNaN(d.getTime())) {
          console.log(`📅 Parsed Firestore string: "${dateVal}" -> ${d.toISOString()}`);
          return d;
        }
      } catch (e) {
        console.warn('Error parsing Firestore string format:', e);
      }
    }
  }


  // Handle Firestore Timestamp object (various formats)
  if (dateVal && typeof dateVal === 'object') {
    // Standard Firestore Timestamp with seconds and nanoseconds
    if (dateVal.seconds !== undefined) {
      const d = new Date(dateVal.seconds * 1000 + (dateVal.nanoseconds || 0) / 1000000);
      console.log('📅 Parsed Firestore Timestamp (seconds):', dateVal, '->', d.toISOString());
      return d;
    }
    
    // Firestore Timestamp with _seconds property 
    if (dateVal._seconds !== undefined) {
      const d = new Date(dateVal._seconds * 1000 + (dateVal._nanoseconds || 0) / 1000000);
      console.log('📅 Parsed Firestore Timestamp (_seconds):', dateVal, '->', d.toISOString());
      return d;
    }
    
    // Handle toDate() method if available (Firestore Timestamp)
    if (typeof dateVal.toDate === 'function') {
      try {
        const d = dateVal.toDate();
        console.log('📅 Parsed Firestore Timestamp (toDate):', '->', d.toISOString());
        return d;
      } catch (e) {
        console.warn('Failed to call toDate():', e);
      }
    }
  }
  
  // Try parsing as ISO date string
  const iso = new Date(dateVal);
  if (!isNaN(iso.getTime())) {
    console.log('📅 Parsed as ISO date string:', dateVal, '->', iso.toISOString());
    return iso;
  }
  
  // Try parsing timestamp in milliseconds
  const timestamp = Number(dateVal);
  if (!isNaN(timestamp) && timestamp > 0) {
    const d = new Date(timestamp);
    console.log('📅 Parsed as timestamp:', timestamp, '->', d.toISOString());
    return d;
  }
  
  console.warn('❌ Failed to parse date. Raw value:', dateVal, 'Type:', typeof dateVal, 'Stringified:', JSON.stringify(dateVal));
  return null;
}

import { Client } from "@/types/Client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { ChevronDown, ChevronsLeft, ChevronsRight } from "lucide-react"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select"

// Props for the generic DataTable component
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  meta?: { onSuccess?: () => void } // Optional meta for passing callbacks to cell actions
}

// Generic DataTable component for admin/clients
export function DataTable<TData, TValue>({
  columns,
  data,
  meta,
}: DataTableProps<TData, TValue>) {

  // Table state for sorting, filtering, and global search
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10, 
  })
  // Year and Month filter state
  const [yearFilter, setYearFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(false);
  const [filterOrder, setFilterOrder] = useState<Array<{type: string, value: string}>>([]);
  
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  // Filter summary label with click order tracking
  const filterSummaryLabel = useMemo(() => {
    const orderedFilters: string[] = [];
    
    // Add filters in the order they were selected
    filterOrder.forEach(filter => {
      if (filter.type === 'year' && yearFilter !== "all") {
        orderedFilters.push(filter.value);
      } else if (filter.type === 'month' && monthFilter !== "all") {
        const monthName = monthNames[parseInt(filter.value) - 1];
        if (monthName) orderedFilters.push(monthName);
      }
    });
    
    // Add Year and Month at the end if not already added via filterOrder
    if (yearFilter !== "all" && !filterOrder.some(f => f.type === 'year')) {
      orderedFilters.push(yearFilter);
    }
    if (monthFilter !== "all" && !filterOrder.some(f => f.type === 'month')) {
      const monthName = monthNames[parseInt(monthFilter) - 1];
      if (monthName) orderedFilters.push(monthName);
    }
    
    // Add global filter if present
    if (globalFilter) orderedFilters.push(`"${globalFilter}"`);
    
    return orderedFilters.length > 0 ? orderedFilters.join(" + ") : "No filters applied";
  }, [yearFilter, monthFilter, globalFilter, filterOrder, monthNames]);
  
  // Derive available years from data and always include 2019-2026
  const availableYears = useMemo(() => {
    const fixedYears = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
    const dataYears = data
      .map((item: any) => {
        const d = parseClientDate(item.createdAt);
        if (d && !isNaN(d.getTime())) {
          const year = d.getFullYear();
          // Only include reasonable years (1970-2100)
          if (year >= 1970 && year <= 2100) {
            return year;
          }
        }
        return null;
      })
      .filter((y): y is number => y !== null);
    
    const allYears = Array.from(new Set([...fixedYears, ...dataYears])).sort((a, b) => b - a);
    console.log('📅 Available years for filter:', allYears, `(from ${dataYears.length} valid dates)`);
    return allYears;
  }, [data]);

  // Filter data by search, year, and month with useMemo for performance
  const filteredData = useMemo(() => {
    console.group(`🔍 FILTER OPERATION - Year: ${yearFilter}, Month: ${monthFilter}`);
    console.log(`Total records to filter: ${data.length}`);
    
    const result = data.filter((row: any, idx: number) => {
      // Search filter
      const searchQuery = globalFilter.trim().toLowerCase();
      const matchesSearch = searchQuery === "" || 
        `${row.name || ""} ${row.email || ""} ${row.institution || ""} ${row.designation || ""}`
          .toLowerCase().includes(searchQuery);
      
      // Date filters - handle invalid dates gracefully
      const date = parseClientDate(row.createdAt);
      
      // Debug for first 10 records and any that have issues
      const isFirstTenOrFailed = idx < 10 || !date;
      if (isFirstTenOrFailed) {
        console.log(`Record ${idx}: ${row.cid || row.name}`, {
          rawCreatedAt: row.createdAt,
          parsedDate: date ? date.toISOString() : 'PARSE FAILED',
          parsedYear: date ? date.getFullYear() : 'N/A',
          yearMatches: date ? (date.getFullYear().toString() === yearFilter) : false,
        });
      }
      
      // If filters are "all", include all records regardless of date validity
      if (yearFilter === "all" && monthFilter === "all") {
        return matchesSearch;
      }
      
      // If filters are active but date is invalid, exclude the record
      if (!date) {
        console.warn(`❌ Record ${row.cid} has unparseable date: ${row.createdAt}`);
        return false;
      }
      
      // Apply year and month filters
      const recordYear = date.getFullYear().toString();
      const recordMonth = (date.getMonth() + 1).toString();
      
      const matchesYear = yearFilter === "all" || recordYear === yearFilter;
      const matchesMonth = monthFilter === "all" || recordMonth === monthFilter;
      
      return matchesSearch && matchesYear && matchesMonth;
    });
    
    console.log(`✅ Filtered: ${result.length} records match Year:${yearFilter} Month:${monthFilter}`);
    console.groupEnd();
    
    return result;
  }, [data, globalFilter, yearFilter, monthFilter]);

  // Reset pagination when filters change
  useEffect(() => {
    console.log('🔄 Filters changed, resetting to page 1');
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, [globalFilter, yearFilter, monthFilter]);

  // Initialize TanStack Table instance
  const table = useReactTable({
    data: filteredData,
    columns,
    meta,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getRowId: (row: any, index: number) => row.cid || `row-${index}`,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
  });

  // Calculate record range for display
  const totalRecords = filteredData.length;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const startRecord = totalRecords > 0 ? pageIndex * pageSize + 1 : 0;
  const endRecord = Math.min((pageIndex + 1) * pageSize, totalRecords);

  const PaginationControls = () => (
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
          {pageIndex + 1} / {table.getPageCount() || 1}
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
            {/* Search & Date Filters */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-end gap-2 pb-1">
                <div className="space-y-0.5">
                  <span className="text-[8px] font-bold uppercase text-muted-foreground ml-1">Search</span>
                  <Input
                    placeholder="Search clients..."
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    className="w-56 h-7 text-sm"
                  />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[8px] font-bold uppercase text-muted-foreground ml-1">Year</span>
                  <Select value={yearFilter} onValueChange={(value) => {
                    setYearFilter(value);
                    if (value === "all") {
                      setFilterOrder(prev => prev.filter(f => f.type !== 'year'));
                    } else {
                      setFilterOrder(prev => {
                        const filtered = prev.filter(f => f.type !== 'year');
                        return [...filtered, {type: 'year', value: value}];
                      });
                    }
                  }}>
                    <SelectTrigger className="w-[120px] h-7 text-sm">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {availableYears.map(y => (
                        <SelectItem key={y as number} value={y?.toString() || ''}>{y as number}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[8px] font-bold uppercase text-muted-foreground ml-1">Month</span>
                  <Select value={monthFilter} onValueChange={(value) => {
                    setMonthFilter(value);
                    if (value === "all") {
                      setFilterOrder(prev => prev.filter(f => f.type !== 'month'));
                    } else {
                      setFilterOrder(prev => {
                        const filtered = prev.filter(f => f.type !== 'month');
                        return [...filtered, {type: 'month', value: value}];
                      });
                    }
                  }}>
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
                {/* Summary Card moved here */}
                <div className="flex flex-1 justify-end min-w-[220px]">
                  <div 
                    onClick={() => {
                      if (globalFilter || yearFilter !== 'all' || monthFilter !== 'all') {
                        setGlobalFilter("");
                        setYearFilter("all");
                        setMonthFilter("all");
                        setFilterOrder([]);
                      }
                    }}
                    className={`p-3 rounded-lg border transition-all duration-200 ${
                      (globalFilter || yearFilter !== 'all' || monthFilter !== 'all')
                        ? "bg-blue-50 border-blue-200 cursor-pointer hover:bg-blue-100"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="text-right">
                      <div className="text-xs font-medium text-gray-600 mb-1">
                        {filterSummaryLabel}
                      </div>
                      <div className="text-lg font-bold text-gray-800">{totalRecords} records</div>
                      {(globalFilter || yearFilter !== 'all' || monthFilter !== 'all') && (
                        <div className="text-xs text-blue-600 mt-1 font-medium">
                          Click to clear all filters
                        </div>
                      )}
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
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">
            Showing {startRecord} - {endRecord} of {totalRecords} records
          </div>
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
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="h-10 text-xs font-semibold">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            { ...header.getContext(), meta }
                          )}
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
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-2">
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
                        setGlobalFilter("");
                        setYearFilter("all");
                        setMonthFilter("all");
                        setFilterOrder([]);
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
