// Admin Projects Data Table
// Generic, reusable data table for displaying and filtering projects in the admin dashboard.

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
import { Project } from "@/types/Project"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// Props for the generic DataTable component
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  meta?: { onSuccess?: () => void }
}

// Custom global filter: checks if any cell value contains the filter string
function customGlobalFilterFn<TData extends object>(
  row: any,
  columnId: string,
  filterValue: string
) {
  const values = Object.values(row.original).map((v) =>
    Array.isArray(v) ? v.join(", ") : String(v ?? "")
  )
  return values.some((value) =>
    value.toLowerCase().includes(filterValue.toLowerCase())
  )
}

// Generic DataTable component for displaying tabular data with search, filter, and pagination
export function DataTable<TData, TValue>({
  columns,
  data,
  meta,
}: DataTableProps<TData, TValue>) {
  // State for sorting, column filters, and global search
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState("")

  // Set up TanStack Table instance
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    globalFilterFn: customGlobalFilterFn,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getRowId: (row: any) => row.pid || String(Math.random()), // Use pid as unique row identifier
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  })

  // Track which status filter is selected for button highlighting
  const selectedStatus = table.getColumn("status")?.getFilterValue()

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Global search input */}
          <Input
            placeholder="Search projects..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="max-w-sm"
          />
          {/* Status filter buttons */}
          <Button
            variant="outline"
            onClick={() => table.getColumn("status")?.setFilterValue("Completed")}
            className={cn(
              "ml-2",
              selectedStatus === "Completed" ? "bg-primary text-primary-foreground border-primary" : ""
            )}
          >
            Completed
          </Button>
          <Button
            variant="outline"
            onClick={() => table.getColumn("status")?.setFilterValue("Ongoing")}
            className={cn(
              selectedStatus === "Ongoing" ? "bg-primary text-primary-foreground border-primary" : ""
            )}
          >
            Ongoing
          </Button>
          <Button
            variant="outline"
            onClick={() => table.getColumn("status")?.setFilterValue("Cancelled")}
            className={cn(
              selectedStatus === "Cancelled" ? "bg-primary text-primary-foreground border-primary" : ""
            )}
          >
            Cancelled
          </Button>
          <Button
            variant="outline"
            onClick={() => table.getColumn("status")?.setFilterValue(undefined)}
            className={cn(
              selectedStatus === undefined ? "bg-primary text-primary-foreground border-primary" : ""
            )}
          >
            All
          </Button>
        </div>
        {/* Row count display */}
        <div className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} of {table.getCoreRowModel().rows.length} projects
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      style={{ width: header.getSize(), minWidth: header.getSize() }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          { ...header.getContext(), meta }
                        )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      style={{ width: cell.column.getSize(), minWidth: cell.column.getSize() }}
                    >
                      {flexRender(cell.column.columnDef.cell, { ...cell.getContext(), meta })}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
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
        <div className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
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