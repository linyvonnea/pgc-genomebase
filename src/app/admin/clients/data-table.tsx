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
import { useState } from "react"
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
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  // Derive available years from data
  const availableYears = Array.from(new Set(
    data
      .map((item: any) => {
        const d = item.createdAt ? new Date(item.createdAt) : null;
        return d && !isNaN(d.getTime()) ? d.getFullYear() : null;
      })
      .filter((y) => y !== null)
  )).sort((a, b) => (b as number) - (a as number));

  // Filter data by search, year, and month
  const filteredData = data.filter((row: any) => {
    // Search filter
    const searchQuery = globalFilter.trim().toLowerCase();
    const matchesSearch = searchQuery === "" || 
      `${row.name || ""} ${row.email || ""} ${row.institution || ""} ${row.designation || ""}`
        .toLowerCase().includes(searchQuery);
    
    // Date filters
    const date = row.createdAt ? new Date(row.createdAt) : null;
    const matchesYear = yearFilter === "all" || (date && date.getFullYear().toString() === yearFilter);
    const matchesMonth = monthFilter === "all" || (date && (date.getMonth() + 1).toString() === monthFilter);
    
    return matchesSearch && matchesYear && matchesMonth;
  });

  // Initialize TanStack Table instance
  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getRowId: (row: any) => row.cid || String(Math.random()),
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
  })

  // Calculate record range for display
  const totalRecords = table.getFilteredRowModel().rows.length;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const startRecord = totalRecords > 0 ? pageIndex * pageSize + 1 : 0;
  const endRecord = Math.min((pageIndex + 1) * pageSize, totalRecords);

  // Pagination Controls (styled like Quotations)
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
            {/* Search & Date Filters with Summary Card */}
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
                  <Select value={yearFilter} onValueChange={setYearFilter}>
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
                      setGlobalFilter("");
                      setYearFilter("all");
                      setMonthFilter("all");
                    }}
                    className="rounded-lg border px-2 py-1.5 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-sm w-[300px] bg-white hover:bg-gray-50 border-gray-200"
                  >
                    <div className="space-y-1">
                      <div className="text-[13px] text-primary font-medium uppercase tracking-wide">
                        Summary
                      </div>
                      <div className="text-lg font-bold text-gray-800">
                        {totalRecords} Clients
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <div className="text-xs text-blue-600 font-semibold">
                          {totalRecords} {totalRecords === 1 ? 'result' : 'results'}
                        </div>
                        <div className="text-[10px] font-medium text-gray-500 truncate">
                          {globalFilter || yearFilter !== 'all' || monthFilter !== 'all' 
                            ? [globalFilter, yearFilter !== 'all' && yearFilter, monthFilter !== 'all' && monthNames[parseInt(monthFilter) - 1]].filter(Boolean).join(' + ') || 'Filtered'
                            : 'All Records'
                          }
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
          Showing {startRecord} - {endRecord} of {totalRecords} records
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