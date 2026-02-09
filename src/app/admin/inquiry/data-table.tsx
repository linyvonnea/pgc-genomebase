/**
 * Admin Inquiry Data Table Component
 * 
 * Enhanced data table with comprehensive filtering, search, and overview features.
 * Built with TanStack Table (React Table v8) for advanced table functionality.
 * 
 * Key Features:
 * - Collapsible Filters & Overview section
 * - Status-based filtering with count cards
 * - Search by name, email, or affiliation
 * - Year and month filtering
 * - Summary card showing total count
 * - Advanced pagination with configurable rows per page
 * - Sticky table header
 * - Column sorting
 */

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
import { useState, useMemo } from "react"
import { Inquiry } from "@/types/Inquiry"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ChevronDown, X } from "lucide-react"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [activeStatusFilter, setActiveStatusFilter] = useState<string | undefined>(undefined)
  const [selectedYear, setSelectedYear] = useState<string>("")
  const [selectedMonth, setSelectedMonth] = useState<string>("")
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(false)
  const [filterOrder, setFilterOrder] = useState<Array<{type: string, value: string}>>([])

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Calculate status counts
  const statusCounts = useMemo(() => {
    const inquiries = data as unknown as Inquiry[]
    return {
      approvedClient: inquiries.filter(i => i.status === "Approved Client").length,
      quotationOnly: inquiries.filter(i => i.status === "Quotation Only").length,
      pending: inquiries.filter(i => i.status === "Pending").length,
    }
  }, [data])

  // Filter summary label with click order tracking
  const filterSummaryLabel = useMemo(() => {
    const orderedFilters = [];
    
    // Add filters in the order they were selected
    filterOrder.forEach(filter => {
      if (filter.type === 'status' && activeStatusFilter) {
        orderedFilters.push(activeStatusFilter);
      } else if (filter.type === 'year' && selectedYear && selectedYear !== "all") {
        orderedFilters.push(selectedYear);
      } else if (filter.type === 'month' && selectedMonth && selectedMonth !== "all") {
        const monthName = monthNames[parseInt(selectedMonth) - 1];
        if (monthName) orderedFilters.push(monthName);
      }
    });
    
    // Add Year and Month at the end if not already added via filterOrder
    if (selectedYear && selectedYear !== "all" && !filterOrder.some(f => f.type === 'year')) {
      orderedFilters.push(selectedYear);
    }
    if (selectedMonth && selectedMonth !== "all" && !filterOrder.some(f => f.type === 'month')) {
      const monthName = monthNames[parseInt(selectedMonth) - 1];
      if (monthName) orderedFilters.push(monthName);
    }
    
    // Add global filter if present
    if (globalFilter) orderedFilters.push(`"${globalFilter}"`);
    
    return orderedFilters.length > 0 ? orderedFilters.join(" + ") : "No filters applied";
  }, [activeStatusFilter, selectedYear, selectedMonth, globalFilter, filterOrder, monthNames]);

  // Get available years from data
  const availableYears = useMemo(() => {
    const inquiries = data as unknown as Inquiry[]
    const years = new Set(
      inquiries.map(i => new Date(i.createdAt).getFullYear().toString())
    )
    return Array.from(years).sort((a, b) => b.localeCompare(a))
  }, [data])

  // Month options
  const monthOptions = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ]

  // Custom filter function for date filtering
  const dateFilter = (row: any) => {
    const inquiry = row.original as Inquiry
    const date = new Date(inquiry.createdAt)
    const year = date.getFullYear().toString()
    const month = (date.getMonth() + 1).toString()

    if (selectedYear && year !== selectedYear) return false
    if (selectedMonth && month !== selectedMonth) return false
    return true
  }

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnId, filterValue) => {
      const inquiry = row.original as Inquiry
      const searchStr = filterValue.toLowerCase()
      return (
        inquiry.name?.toLowerCase().includes(searchStr) ||
        inquiry.email?.toLowerCase().includes(searchStr) ||
        inquiry.affiliation?.toLowerCase().includes(searchStr) ||
        inquiry.status?.toLowerCase().includes(searchStr)
      )
    },
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  // Apply date filter
  const filteredRows = table.getFilteredRowModel().rows.filter(dateFilter)

  const handleStatusFilter = (status: string | undefined) => {
    setActiveStatusFilter(status)
    table.getColumn("status")?.setFilterValue(status)
    if (status) {
      setFilterOrder(prev => [...prev.filter(f => f.type !== 'status'), {type: 'status', value: status}])
    } else {
      setFilterOrder(prev => prev.filter(f => f.type !== 'status'))
    }
  }

  const handleYearChange = (year: string) => {
    setSelectedYear(year === "all" ? "" : year)
    if (year === "all") setSelectedMonth("")
    
    if (year === "all") {
      setFilterOrder(prev => prev.filter(f => f.type !== 'year'))
    } else {
      setFilterOrder(prev => [...prev.filter(f => f.type !== 'year'), {type: 'year', value: year}])
    }
  }

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month === "all" ? "" : month)
    
    if (month === "all") {
      setFilterOrder(prev => prev.filter(f => f.type !== 'month'))
    } else {
      setFilterOrder(prev => [...prev.filter(f => f.type !== 'month'), {type: 'month', value: month}])
    }
  }

  const clearAllFilters = () => {
    setActiveStatusFilter(undefined)
    setSelectedYear("")
    setSelectedMonth("")
    setGlobalFilter("")
    setFilterOrder([])
    table.getColumn("status")?.setFilterValue(undefined)
  }

  const activeFiltersCount = [
    activeStatusFilter,
    selectedYear,
    selectedMonth,
    globalFilter,
  ].filter(Boolean).length

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
          <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-3">
            {/* Primary Content Filters Row */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Processing Status */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Processing Status</label>
                <div className="grid grid-cols-1 gap-1">
                  <button
                    onClick={() =>
                      handleStatusFilter(
                        activeStatusFilter === "Approved Client" ? undefined : "Approved Client"
                      )
                    }
                    className={`rounded-md border px-2 py-2 text-[9px] font-medium transition-all duration-200 hover:shadow-sm ${
                      activeStatusFilter === "Approved Client"
                        ? "bg-green-50 border-green-200 font-semibold text-green-600"
                        : "bg-white border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                    }`}
                  >
                    Approved Client
                  </button>
                  <button
                    onClick={() =>
                      handleStatusFilter(
                        activeStatusFilter === "Quotation Only" ? undefined : "Quotation Only"
                      )
                    }
                    className={`rounded-md border px-2 py-2 text-[9px] font-medium transition-all duration-200 hover:shadow-sm ${
                      activeStatusFilter === "Quotation Only"
                        ? "bg-blue-50 border-blue-200 font-semibold text-blue-600"
                        : "bg-white border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                    }`}
                  >
                    Quotation Only
                  </button>
                  <button
                    onClick={() =>
                      handleStatusFilter(activeStatusFilter === "Pending" ? undefined : "Pending")
                    }
                    className={`rounded-md border px-2 py-2 text-[9px] font-medium transition-all duration-200 hover:shadow-sm ${
                      activeStatusFilter === "Pending"
                        ? "bg-yellow-50 border-yellow-200 font-semibold text-yellow-600"
                        : "bg-white border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                    }`}
                  >
                    Pending
                  </button>
                </div>
              </div>
            </div>

            {/* Search Tools & Summary Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
              {/* Search Tools */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Input
                    placeholder="Search all fields..."
                    value={globalFilter ?? ""}
                    onChange={(event) => setGlobalFilter(event.target.value)}
                    className="w-56 pl-3 pr-8 h-8 text-sm"
                  />
                  {globalFilter && (
                    <button
                      onClick={() => setGlobalFilter("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <Select value={selectedYear || "all"} onValueChange={handleYearChange}>
                  <SelectTrigger className="w-24 h-8">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={selectedMonth || "all"}
                  onValueChange={handleMonthChange}
                >
                  <SelectTrigger className="w-28 h-8">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {monthOptions.map((month) => (
                      <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Summary & Clear Filters */}
              <div className="flex items-center justify-end gap-3">
                <div 
                  onClick={activeFiltersCount > 0 ? clearAllFilters : undefined}
                  className={`p-3 rounded-lg border transition-all duration-200 ${
                    activeFiltersCount > 0
                      ? "bg-blue-50 border-blue-200 cursor-pointer hover:bg-blue-100"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="text-right">
                    <div className="text-xs font-medium text-gray-600 mb-1">
                      {filterSummaryLabel}
                    </div>
                    <div className="text-lg font-bold text-gray-800">{filteredRows.length} records</div>
                    {activeFiltersCount > 0 && (
                      <div className="text-xs text-blue-600 mt-1 font-medium">
                        Click to clear all filters
                      </div>
                    )}
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
          Showing {filteredRows.length > 0 ? (table.getState().pagination.pageIndex * table.getState().pagination.pageSize) + 1 : 0} - {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, filteredRows.length)} of {filteredRows.length} records
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Rows:</span>
          <Select
            value={table.getState().pagination.pageSize.toString()}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="w-[70px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
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
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
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
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort?.()
                    const sortDir = header.column.getIsSorted?.()
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
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {filteredRows.length ? (
                filteredRows
                  .slice(
                    table.getState().pagination.pageIndex * table.getState().pagination.pageSize,
                    (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize
                  )
                  .map((row) => (
                    <TableRow
                      key={row.id}
                      className="hover:bg-muted/50 transition-colors"
                      data-state={row.getIsSelected() && "selected"}
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
                      <Button variant="link" onClick={clearAllFilters}>Clear all filters</Button>
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
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Rows:</span>
            <Select
              value={table.getState().pagination.pageSize.toString()}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger className="w-[70px] h-8">
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

          <div className="flex items-center gap-1">
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
              {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
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
          </div>
        </div>
      </div>
    </div>
  )
}