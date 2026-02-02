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
import { ChevronDown, ChevronUp } from "lucide-react"

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
      total: inquiries.length,
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

  const activeFiltersCount = [
    activeStatusFilter,
    selectedYear,
    selectedMonth,
    globalFilter,
  ].filter(Boolean).length

  return (
    <div className="space-y-4">
      {/* Filters & Overview Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Filters & Overview</h3>
              {activeFiltersCount > 0 && (
                <Badge variant="secondary">{activeFiltersCount} active</Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFiltersCollapsed(!isFiltersCollapsed)}
            >
              {isFiltersCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>

          {!isFiltersCollapsed && (
            <div className="space-y-4">
              {/* Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card
                  className={`cursor-pointer transition-all ${
                    activeStatusFilter === "Approved Client"
                      ? "ring-2 ring-green-500 bg-green-50"
                      : "hover:bg-gray-50"
                  }`}
                  onClick={() =>
                    handleStatusFilter(
                      activeStatusFilter === "Approved Client" ? undefined : "Approved Client"
                    )
                  }
                >
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">
                      {statusCounts.approvedClient}
                    </div>
                    <div className="text-sm text-muted-foreground">Approved Client</div>
                  </CardContent>
                </Card>

                <Card
                  className={`cursor-pointer transition-all ${
                    activeStatusFilter === "Quotation Only"
                      ? "ring-2 ring-blue-500 bg-blue-50"
                      : "hover:bg-gray-50"
                  }`}
                  onClick={() =>
                    handleStatusFilter(
                      activeStatusFilter === "Quotation Only" ? undefined : "Quotation Only"
                    )
                  }
                >
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-blue-600">
                      {statusCounts.quotationOnly}
                    </div>
                    <div className="text-sm text-muted-foreground">Quotation Only</div>
                  </CardContent>
                </Card>

                <Card
                  className={`cursor-pointer transition-all ${
                    activeStatusFilter === "Pending"
                      ? "ring-2 ring-yellow-500 bg-yellow-50"
                      : "hover:bg-gray-50"
                  }`}
                  onClick={() =>
                    handleStatusFilter(activeStatusFilter === "Pending" ? undefined : "Pending")
                  }
                >
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-yellow-600">
                      {statusCounts.pending}
                    </div>
                    <div className="text-sm text-muted-foreground">Pending</div>
                  </CardContent>
                </Card>

                <Card
                  className={`cursor-pointer transition-all ${
                    !activeStatusFilter ? "ring-2 ring-primary bg-primary/5" : "hover:bg-gray-50"
                  }`}
                  onClick={() => handleStatusFilter(undefined)}
                >
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{statusCounts.total}</div>
                    <div className="text-sm text-muted-foreground">Total Inquiries</div>
                  </CardContent>
                </Card>
              </div>

              {/* Search and Date Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  placeholder="Search by name, email, or affiliation..."
                  value={globalFilter ?? ""}
                  onChange={(event) => setGlobalFilter(event.target.value)}
                  className="md:col-span-1"
                />

                <Select value={selectedYear || "all"} onValueChange={handleYearChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Year" />
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

                <Select
                  value={selectedMonth || "all"}
                  onValueChange={handleMonthChange}
                  disabled={!selectedYear}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Month" />
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

              {/* Summary and Clear Button */}
              <div className="flex items-center justify-between">
                <Card className="flex-1 mr-4">
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground">Showing Results</div>
                        <div className="text-2xl font-bold">{filteredRows.length}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {activeFiltersCount > 0 && (
                  <Button variant="outline" onClick={clearAllFilters}>
                    Clear All Filters
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls - Top */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <Select
            value={table.getState().pagination.pageSize.toString()}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            Showing {filteredRows.length > 0 ? table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1 : 0}-
            {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, filteredRows.length)} of{" "}
            {filteredRows.length} results
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {table.getPageCount() > 0 ? table.getState().pagination.pageIndex + 1 : 0} of {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Table with Sticky Header */}
      <div className="rounded-md border">
        <div className="relative overflow-auto max-h-[600px]">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="bg-background"
                      onClick={header.column.getToggleSortingHandler()}
                      style={{ cursor: header.column.getCanSort() ? "pointer" : "default" }}
                    >
                      <div className="flex items-center gap-2">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === "asc" && <span>↑</span>}
                        {header.column.getIsSorted() === "desc" && <span>↓</span>}
                      </div>
                    </TableHead>
                  ))}
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
                    <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No results found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination Controls - Bottom */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {filteredRows.length > 0 ? table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1 : 0}-
          {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, filteredRows.length)} of{" "}
          {filteredRows.length} results
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {table.getPageCount() > 0 ? table.getState().pagination.pageIndex + 1 : 0} of {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}