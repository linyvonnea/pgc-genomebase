/**
 * Admin Inquiry Data Table Component
 * 
 * This component provides a feature-rich data table for managing inquiries in the admin interface.
 * Built with TanStack Table (React Table v8) for advanced table functionality including sorting, filtering, pagination, and global search.
 * 
 * Used in:
 * - Admin inquiry management page (/admin/inquiry)
 * - Admin dashboard for inquiry overview
 * 
 * Key Features:
 * - Global search across all inquiry fields
 * - Status-based filtering with dedicated buttons
 * - Column sorting (ascending/descending)
 * - Pagination with page navigation
 * - Responsive table layout
 * - Real-time row count display
 * - Empty state handling
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
import { useState } from "react"
import { Inquiry } from "@/types/Inquiry"
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


// Generic data table props interface
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[] // Column definitions from columns.tsx
  data: TData[] // Array of inquiry data to display
}

/**
 * DataTable Component
 * A reusable data table component that can be used with any data type.
 * Currently optimized for Inquiry data but designed to be generic.
 */
export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  // State for table sorting (which column, direction)
  const [sorting, setSorting] = useState<SortingState>([])
  
  // State for column-specific filters (search terms per column)
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  
  // State for global search across all columns
  const [globalFilter, setGlobalFilter] = useState("")
  
  // State to track which status filter is currently active
  const [activeStatusFilter, setActiveStatusFilter] = useState<string | undefined>(undefined)

  // Initialize the table instance with all features enabled
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),         // Basic table functionality
    getSortedRowModel: getSortedRowModel(),     // Enable column sorting
    getFilteredRowModel: getFilteredRowModel(), // Enable filtering
    getPaginationRowModel: getPaginationRowModel(), // Enable pagination
    onSortingChange: setSorting,                // Handle sort state changes
    onColumnFiltersChange: setColumnFilters,    // Handle filter state changes
    onGlobalFilterChange: setGlobalFilter,      // Handle global search changes
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  })

  /**
   * Handler for status filter buttons
   * 
   * Updates both the visual active state and applies the filter to the status column. When undefined is passed, it clears the status filter to show all inquiries.
   */
  const handleStatusFilter = (status: string | undefined) => {
    setActiveStatusFilter(status)
    table.getColumn("status")?.setFilterValue(status)
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Global search input */}
          <Input
            placeholder="Search inquiries..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="max-w-sm"
          />
          
          {/* Status filter buttons */}
          {/* Each button shows as solid when active, outline when inactive */}
          <Button
            variant={activeStatusFilter === "Approved Client" ? "default" : "outline"}
            onClick={() => handleStatusFilter("Approved Client")}
            className="ml-2"
          >
            Approved Client
          </Button>
          <Button
            variant={activeStatusFilter === "Quotation Only" ? "default" : "outline"}
            onClick={() => handleStatusFilter("Quotation Only")}
          >
            Quotation Only
          </Button>
          <Button
            variant={activeStatusFilter === "Pending" ? "default" : "outline"}
            onClick={() => handleStatusFilter("Pending")}
          >
            Pending
          </Button>
          <Button
            variant={activeStatusFilter === undefined ? "default" : "outline"}
            onClick={() => handleStatusFilter(undefined)}
          >
            All
          </Button>
        </div>
        
        {/* Results counter */}
        <div className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} of {table.getCoreRowModel().rows.length} inquiries
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          {/* Table header with column names */}
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          
          {/* Table body with data rows */}
          <TableBody>
            {table.getRowModel().rows?.length ? (
              // Render each row of data
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"} 
                >
                  {/* Render each cell in the row */}
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              // Empty state when no data matches current filters
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between space-x-2">
        {/* Current page indicator */}
        <div className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </div>
        
        {/* Navigation buttons */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()} // Disable when on first page
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()} // Disable when on last page
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}