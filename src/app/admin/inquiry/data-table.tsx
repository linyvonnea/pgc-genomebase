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

import React from "react";
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
import { useRouter } from "next/navigation"
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
import { ChevronDown, X, MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  unreadInquiryIds?: Set<string>
}

export function DataTable<TData, TValue>({
  columns,
  data,
  unreadInquiryIds = new Set(),
}: DataTableProps<TData, TValue>) {
  const router = useRouter()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [activeStatusFilter, setActiveStatusFilter] = useState<string | undefined>(undefined)
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [selectedYear, setSelectedYear] = useState<string>("")
  const [selectedMonth, setSelectedMonth] = useState<string>("")
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(true)
  // Filter order type definition
  type FilterOrderItem = {type: string, value: string};
  const [filterOrder, setFilterOrder] = useState<FilterOrderItem[]>([]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Handle row click to navigate to detail page
  const handleRowClick = (inquiry: Inquiry, event: React.MouseEvent) => {
    // Don't navigate if clicking on interactive elements inside the row.
    const target = event.target as HTMLElement
    if (
      target.closest('button') ||
      target.closest('[role="button"]') ||
      target.closest('a') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('select') ||
      target.closest('label') ||
      target.closest('[role="textbox"]') ||
      target.closest('[role="combobox"]') ||
      target.closest('[role="dialog"]') ||
      target.closest('[contenteditable="true"]') ||
      target.closest('[data-stop-row-click="true"]')
    ) {
      return
    }
    router.push(`/admin/inquiry/${inquiry.id}`)
  }

  // Calculate status counts
  const statusCounts = useMemo(() => {
    const inquiries = data as unknown as Inquiry[]
    return {
      approvedClient: inquiries.filter(i => i.status === "Approved Client").length,
      quotationOnly: inquiries.filter(i => i.status === "Quotation Only").length,
      ongoingQuotation: inquiries.filter(i => i.status === "Ongoing Quotation").length,
      pending: inquiries.filter(i => i.status === "Pending").length,
      serviceNotOffered: inquiries.filter(i => i.status === "Service Not Offered").length,
    }
  }, [data])

  // Filter summary label with click order tracking
  const filterSummaryLabel = useMemo(() => {
    const orderedFilters: string[] = [];
    
    // Add filters in the order they were selected
    filterOrder.forEach((filter: FilterOrderItem) => {
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
    if (selectedYear && selectedYear !== "all" && !filterOrder.some((f: FilterOrderItem) => f.type === 'year')) {
      orderedFilters.push(selectedYear);
    }
    if (selectedMonth && selectedMonth !== "all" && !filterOrder.some((f: FilterOrderItem) => f.type === 'month')) {
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

  // Apply date + unread filters
  const filteredRows = table.getRowModel().rows.filter((row) => {
    if (!dateFilter(row)) return false
    if (showUnreadOnly) {
      const inquiry = row.original as unknown as { id: string }
      return unreadInquiryIds.has(inquiry.id)
    }
    return true
  })

  const handleStatusFilter = (status: string | undefined) => {
    setActiveStatusFilter(status)
    table.getColumn("status")?.setFilterValue(status)
    if (status) {
      setFilterOrder((prev: FilterOrderItem[]) => [...prev.filter((f: FilterOrderItem) => f.type !== 'status'), {type: 'status', value: status}])
    } else {
      setFilterOrder((prev: FilterOrderItem[]) => prev.filter((f: FilterOrderItem) => f.type !== 'status'))
    }
  }

  const handleYearChange = (year: string) => {
    setSelectedYear(year === "all" ? "" : year)
    if (year === "all") setSelectedMonth("")
    
    if (year === "all") {
      setFilterOrder((prev: FilterOrderItem[]) => prev.filter((f: FilterOrderItem) => f.type !== 'year'))
    } else {
      setFilterOrder((prev: FilterOrderItem[]) => [...prev.filter((f: FilterOrderItem) => f.type !== 'year'), {type: 'year', value: year}])
    }
  }

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month === "all" ? "" : month)
    
    if (month === "all") {
      setFilterOrder((prev: FilterOrderItem[]) => prev.filter((f: FilterOrderItem) => f.type !== 'month'))
    } else {
      setFilterOrder((prev: FilterOrderItem[]) => [...prev.filter((f: FilterOrderItem) => f.type !== 'month'), {type: 'month', value: month}])
    }
  }

  const clearAllFilters = () => {
    setActiveStatusFilter(undefined)
    setShowUnreadOnly(false)
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
    showUnreadOnly ? "unread" : undefined,
  ].filter(Boolean).length

  return (
    <div className="space-y-4">
      {/* Filters & Overview Section */}
      <Card className="overflow-hidden">
        <div 
          className="flex items-center justify-between px-3 py-2 border-b cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setIsFiltersCollapsed(!isFiltersCollapsed)}
        >
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-gray-800">Filters & Overview</h3>
            {activeFiltersCount > 0 && isFiltersCollapsed && (
              <Badge variant="secondary" className="h-5 px-2 text-[10px] font-semibold bg-blue-100 text-blue-700 hover:bg-blue-100">
                {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} active
              </Badge>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${isFiltersCollapsed ? "" : "rotate-180"}`} />
        </div>
        
        {!isFiltersCollapsed && (
          <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-3">
            {/* Primary Content Filters Row */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Processing Status */}
              <div className="space-y-2 lg:col-span-4">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Processing Status</label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
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
                    Approved Client ({statusCounts.approvedClient})
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
                    Quotation Only ({statusCounts.quotationOnly})
                  </button>
                  <button
                    onClick={() =>
                      handleStatusFilter(
                        activeStatusFilter === "Ongoing Quotation" ? undefined : "Ongoing Quotation"
                      )
                    }
                    className={`rounded-md border px-2 py-2 text-[9px] font-medium transition-all duration-200 hover:shadow-sm ${
                      activeStatusFilter === "Ongoing Quotation"
                        ? "bg-orange-50 border-orange-200 font-semibold text-orange-600"
                        : "bg-white border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                    }`}
                  >
                    Ongoing Quotation ({statusCounts.ongoingQuotation})
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
                    Pending ({statusCounts.pending})
                  </button>
                  <button
                    onClick={() =>
                      handleStatusFilter(activeStatusFilter === "Service Not Offered" ? undefined : "Service Not Offered")
                    }
                    className={`rounded-md border px-2 py-2 text-[9px] font-medium transition-all duration-200 hover:shadow-sm ${
                      activeStatusFilter === "Service Not Offered"
                        ? "bg-slate-100 border-slate-300 font-semibold text-slate-600"
                        : "bg-white border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                    }`}
                  >
                    Service Not Offered ({statusCounts.serviceNotOffered})
                  </button>
                </div>
              </div>
            </div>

            {/* Search Tools & Summary Row */}
            <div className="flex flex-wrap items-end justify-between gap-3 pt-2 border-t border-gray-100">
              {/* Search Tools */}
              <div className="flex items-end gap-3">
                <div className="space-y-0.5">
                  <span className="text-[8px] font-bold uppercase text-muted-foreground ml-1">Search</span>
                  <div className="relative">
                    <Input
                      placeholder="Search all fields..."
                      value={globalFilter ?? ""}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) => setGlobalFilter(event.target.value)}
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
                </div>

                <div className="space-y-0.5">
                  <span className="text-[8px] font-bold uppercase text-muted-foreground ml-1">Year</span>
                  <Select value={selectedYear || "all"} onValueChange={handleYearChange}>
                    <SelectTrigger className="w-24 h-8 text-sm">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {availableYears.map((year: string) => (
                        <SelectItem key={year} value={year}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[8px] font-bold uppercase text-muted-foreground ml-1">Month</span>
                  <Select
                    value={selectedMonth || "all"}
                    onValueChange={handleMonthChange}
                  >
                    <SelectTrigger className="w-28 h-8 text-sm">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Months</SelectItem>
                      {monthOptions.map((month) => (
                        <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                    {/* Removed 'Click to clear all filters' label */}
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
          <span className="text-sm text-muted-foreground">
            Showing {filteredRows.length > 0 ? (table.getState().pagination.pageIndex * table.getState().pagination.pageSize) + 1 : 0} - {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, filteredRows.length)} of {filteredRows.length} records
          </span>
          {unreadInquiryIds.size > 0 && (
            <button
              onClick={() => setShowUnreadOnly((prev) => !prev)}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                showUnreadOnly
                  ? "bg-blue-600 text-white"
                  : "bg-red-500 text-white animate-pulse hover:animate-none hover:bg-red-600"
              }`}
            >
              <MessageCircle className="h-3 w-3" />
              {unreadInquiryIds.size === 1 
                ? "1 client message received" 
                : `${unreadInquiryIds.size} client messages received`}
            </button>
          )}
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
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="max-h-[70vh] overflow-hidden">
          <Table className="w-full border-collapse table-fixed">
            <TableHeader className="sticky top-0 bg-slate-50/95 backdrop-blur-sm z-10 border-b shadow-sm">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent border-0">
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort?.()
                    const sortDir = header.column.getIsSorted?.()
                    return (
                      <TableHead
                        key={header.id}
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                        className={cn(
                          "h-10 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-r border-slate-100 last:border-r-0",
                          canSort ? "cursor-pointer select-none hover:bg-slate-100/50 transition-colors" : ""
                        )}
                        style={{ width: header.column.columnDef.size }}
                      >
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-1.5">
                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                            {canSort && (
                              <div className="flex flex-col -gap-0.5 opacity-40">
                                <span className={cn("text-[8px] leading-none", sortDir === "asc" && "text-blue-600 opacity-100")}>▲</span>
                                <span className={cn("text-[8px] leading-none", sortDir === "desc" && "text-blue-600 opacity-100")}>▼</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {filteredRows.length ? (
                filteredRows.map((row) => (
                    <TableRow
                      key={row.id}
                      className={cn(
                        "group hover:bg-blue-50/30 transition-colors cursor-pointer border-b border-slate-200 last:border-0",
                        unreadInquiryIds.has((row.original as unknown as { id: string }).id)
                          ? "bg-blue-50/60"
                          : ""
                      )}
                      data-state={row.getIsSelected() && "selected"}
                      onClick={(e: React.MouseEvent) => handleRowClick(row.original as Inquiry, e)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell 
                          key={cell.id} 
                          className="py-1.5 px-2 text-[13px] text-slate-600 border-r border-slate-200 last:border-r-0 align-middle truncate"
                          style={{ width: cell.column.columnDef.size }}
                        >
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
              onValueChange={(value: string) => table.setPageSize(Number(value))}
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