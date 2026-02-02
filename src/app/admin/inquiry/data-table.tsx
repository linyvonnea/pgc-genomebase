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
import { ChevronDown } from "lucide-react"

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

  // Calculate status counts
  const statusCounts = useMemo(() => {
    const inquiries = data as unknown as Inquiry[]
    return {
      approvedClient: inquiries.filter(i => i.status === "Approved Client").length,
      quotationOnly: inquiries.filter(i => i.status === "Quotation Only").length,
      pending: inquiries.filter(i => i.status === "Pending").length,
    }
  }, [data])

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
  }

  const handleYearChange = (year: string) => {
    setSelectedYear(year === "all" ? "" : year)
    if (year === "all") setSelectedMonth("")
  }

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month === "all" ? "" : month)
  }

  const clearAllFilters = () => {
    setActiveStatusFilter(undefined)
    setSelectedYear("")
    setSelectedMonth("")
    setGlobalFilter("")
    table.getColumn("status")?.setFilterValue(undefined)
  }

  // Filter summary label (Laboratory+2026+January style)
  const filterSummaryLabel = useMemo(() => {
    const filters = [];
    if (activeStatusFilter) filters.push(activeStatusFilter);
    if (selectedYear) filters.push(selectedYear);
    if (selectedMonth) {
      const m = monthOptions.find(m => m.value === selectedMonth);
      if (m) filters.push(m.label);
    }
    return filters.length > 0 ? filters.join("+") : "All";
  }, [activeStatusFilter, selectedYear, selectedMonth, monthOptions]);

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
          <div className="p-2.5 space-y-2.5">
            {/* Status Cards Section */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">PROCESSING STATUS</h4>
              <div className="grid grid-cols-3 gap-2">
                <div
                  onClick={() =>
                    handleStatusFilter(
                      activeStatusFilter === "Approved Client" ? undefined : "Approved Client"
                    )
                  }
                  className={`rounded-lg border px-2 py-1.5 cursor-pointer transition-all duration-150 hover:scale-[1.02] hover:shadow-sm ${
                    activeStatusFilter === "Approved Client"
                      ? "ring-1 ring-primary ring-offset-1 bg-green-50 border-green-200 shadow-sm"
                      : "bg-white hover:bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="text-sm font-semibold text-green-600 truncate leading-tight">
                    {statusCounts.approvedClient}
                  </div>
                  <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide leading-tight">
                    Approved Client
                  </div>
                  {activeStatusFilter === "Approved Client" && (
                    <div className="mt-0.5">
                      <Badge variant="default" className="text-[7px] h-2.5 px-1">
                        Active
                      </Badge>
                    </div>
                  )}
                </div>

                <div
                  onClick={() =>
                    handleStatusFilter(
                      activeStatusFilter === "Quotation Only" ? undefined : "Quotation Only"
                    )
                  }
                  className={`rounded-lg border px-2 py-1.5 cursor-pointer transition-all duration-150 hover:scale-[1.02] hover:shadow-sm ${
                    activeStatusFilter === "Quotation Only"
                      ? "ring-1 ring-primary ring-offset-1 bg-blue-50 border-blue-200 shadow-sm"
                      : "bg-white hover:bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="text-sm font-semibold text-blue-600 truncate leading-tight">
                    {statusCounts.quotationOnly}
                  </div>
                  <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide leading-tight">
                    Quotation Only
                  </div>
                  {activeStatusFilter === "Quotation Only" && (
                    <div className="mt-0.5">
                      <Badge variant="default" className="text-[7px] h-2.5 px-1">
                        Active
                      </Badge>
                    </div>
                  )}
                </div>

                <div
                  onClick={() =>
                    handleStatusFilter(activeStatusFilter === "Pending" ? undefined : "Pending")
                  }
                  className={`rounded-lg border px-2 py-1.5 cursor-pointer transition-all duration-150 hover:scale-[1.02] hover:shadow-sm ${
                    activeStatusFilter === "Pending"
                      ? "ring-1 ring-primary ring-offset-1 bg-yellow-50 border-yellow-200 shadow-sm"
                      : "bg-white hover:bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="text-sm font-semibold text-yellow-600 truncate leading-tight">
                    {statusCounts.pending}
                  </div>
                  <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide leading-tight">
                    Pending
                  </div>
                  {activeStatusFilter === "Pending" && (
                    <div className="mt-0.5">
                      <Badge variant="default" className="text-[7px] h-2.5 px-1">
                        Active
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Search & Date Filters with Summary Card */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-end gap-2 pb-1">
                <div className="space-y-0.5">
                  <span className="text-[8px] font-bold uppercase text-muted-foreground ml-1">Search</span>
                  <Input
                    placeholder="Search by name, email..."
                    value={globalFilter ?? ""}
                    onChange={(event) => setGlobalFilter(event.target.value)}
                    className="w-56 h-7 text-sm"
                  />
                </div>

                <div className="space-y-0.5">
                  <span className="text-[8px] font-bold uppercase text-muted-foreground ml-1">Year</span>
                  <Select value={selectedYear || "all"} onValueChange={handleYearChange}>
                    <SelectTrigger className="w-[120px] h-7 text-sm">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {availableYears.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[8px] font-bold uppercase text-muted-foreground ml-1">Month</span>
                  <Select
                    value={selectedMonth || "all"}
                    onValueChange={handleMonthChange}
                    disabled={!selectedYear}
                  >
                    <SelectTrigger className="w-[140px] h-7 text-sm">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Months</SelectItem>
                      {monthOptions.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Summary Card aligned with filters */}
                <div className="ml-auto">
                  <div
                    onClick={clearAllFilters}
                    className={`rounded-lg border px-2 py-1.5 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-sm w-[300px] ${
                      activeFiltersCount === 0
                        ? "ring-1 ring-primary ring-offset-1 bg-slate-50 border-slate-200 shadow-sm"
                        : "bg-white hover:bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="text-[13px] text-primary font-medium uppercase tracking-wide">
                        Summary
                      </div>
                      <div className="text-lg font-bold text-gray-800">
                        {filteredRows.length} {filteredRows.length === 1 ? 'inquiry' : 'inquiries'}
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <div />
                        <div className="text-[10px] font-medium text-gray-500 truncate text-right w-full">
                          {filterSummaryLabel !== 'All' ? filterSummaryLabel : 'none'}
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