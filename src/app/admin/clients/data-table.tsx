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

  // Initialize TanStack Table instance
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
    onPaginationChange: setPagination,
    getRowId: (row: any) => row.cid || String(Math.random()),
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
  })

  // Year and Month filter state
  const [yearFilter, setYearFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
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

  // Filter data by year/month
  const filteredData = data.filter((row: any) => {
    const date = row.createdAt ? new Date(row.createdAt) : null;
    const matchesYear = yearFilter === "all" || (date && date.getFullYear().toString() === yearFilter);
    const matchesMonth = monthFilter === "all" || (date && (date.getMonth() + 1).toString() === monthFilter);
    return matchesYear && matchesMonth;
  });

  // Calculate record range for display
  const totalRecords = filteredData.length;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const startRecord = totalRecords > 0 ? pageIndex * pageSize + 1 : 0;
  const endRecord = Math.min((pageIndex + 1) * pageSize, totalRecords);

  // Pagination Controls (styled like Quotations)
  const PaginationControls = () => (
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
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Search, Year, and Month Filters */}
      <div className="flex flex-wrap items-end gap-2 pb-1">
        <div className="space-y-0.5">
          <span className="text-[8px] font-bold uppercase text-muted-foreground ml-1">Search</span>
          <Input
            placeholder="Search clients..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="w-56 h-7 text-sm"
          />
        </div>
        <div className="space-y-0.5">
          <span className="text-[8px] font-bold uppercase text-muted-foreground ml-1">Year</span>
          <select
            value={yearFilter}
            onChange={e => setYearFilter(e.target.value)}
            className="w-[120px] h-7 text-sm border rounded px-2"
          >
            <option value="all">All Years</option>
            {availableYears.map(y => (
              <option key={y as number} value={y as number}>{y as number}</option>
            ))}
          </select>
        </div>
        <div className="space-y-0.5">
          <span className="text-[8px] font-bold uppercase text-muted-foreground ml-1">Month</span>
          <select
            value={monthFilter}
            onChange={e => setMonthFilter(e.target.value)}
            className="w-[140px] h-7 text-sm border rounded px-2"
          >
            <option value="all">All Months</option>
            {monthNames.map((m, idx) => (
              <option key={m} value={(idx + 1).toString()}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Header with Record Count and Navigation */}
      <div className="flex items-center justify-between py-1">
        <div className="text-sm text-muted-foreground">
          Showing {startRecord} - {endRecord} of {totalRecords} records
        </div>
        <PaginationControls />
      </div>

      {/* Table */}
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
              {/* Render rows or show 'No results' if empty */}
              {filteredData.length ? (
                filteredData.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize).map((row: any) => (
                  <TableRow
                    key={row.cid}
                    data-state={row.getIsSelected && row.getIsSelected() && "selected"}
                    className="hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    {table.getVisibleFlatColumns().map((col, colIdx) => (
                      <TableCell key={colIdx} className="py-2 text-sm">
                        {flexRender(col.columnDef.cell, { ...row, meta })}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center h-24 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2 py-4">
                      <p>No results found for current filters.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}