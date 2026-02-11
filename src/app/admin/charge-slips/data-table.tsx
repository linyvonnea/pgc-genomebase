"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useState, useMemo } from "react";
import { ChargeSlipRecord } from "@/types/ChargeSlipRecord";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface Props {
  data: ChargeSlipRecord[];
  columns: ColumnDef<ChargeSlipRecord, any>[];
}

export function ChargeSlipTable({ data, columns }: Props) {
  // Default sort: newest first by dateIssued
  const [sorting, setSorting] = useState<SortingState>([
    { id: "dateIssued", desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("__all");
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);

  const allCategories = ["laboratory", "equipment", "bioinformatics", "retail", "training"];

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const filteredRows = useMemo(() => {
    const q = globalFilter.toLowerCase();
    return table.getRowModel().rows.filter((row) => {
      const matchesSearch = row
        .getAllCells()
        .some((cell) => String(cell.getValue() ?? "").toLowerCase().includes(q));

      const status = String((row.original as any).status ?? "").toLowerCase();
      const matchesStatus =
        statusFilter === "__all" || status === statusFilter.toLowerCase();

      const rowCategories: string[] = (row.original as any).categories || [];
      const matchesCategory =
        categoryFilters.length === 0 ||
        rowCategories.some((cat) => categoryFilters.includes(cat.toLowerCase()));

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [table, globalFilter, statusFilter, categoryFilters]);

  const totalAmount = useMemo(() => {
    return filteredRows.reduce((sum, row) => {
      const status = String((row.original as any).status ?? "").toLowerCase();
      return status === "paid" ? sum + (Number((row.original as any).total) || 0) : sum;
    }, 0);
  }, [filteredRows]);

  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(false);

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
              {/* Service Categories */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Service Categories</label>
                <div className="grid grid-cols-2 gap-1">
                  {allCategories.map((cat) => {
                    const isActive = categoryFilters.includes(cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => {
                          if (isActive) {
                            setCategoryFilters((prev) => prev.filter((c) => c !== cat));
                          } else {
                            setCategoryFilters((prev) => [...prev, cat]);
                          }
                        }}
                        className={`rounded-md border px-2 py-2 text-[9px] font-medium transition-all duration-200 hover:shadow-sm ${
                          isActive
                            ? "bg-blue-50 border-blue-200 font-semibold text-blue-600"
                            : "bg-white border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                        }`}
                      >
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* Processing Status */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Processing Status</label>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={() => setStatusFilter(statusFilter === "processing" ? "__all" : "processing")}
                    className={`rounded-md border px-2 py-2 text-[9px] font-medium transition-all duration-200 hover:shadow-sm ${
                      statusFilter === "processing"
                        ? "bg-yellow-50 border-yellow-200 font-semibold text-yellow-600"
                        : "bg-white border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                    }`}
                  >
                    Processing
                  </button>
                  <button
                    onClick={() => setStatusFilter(statusFilter === "paid" ? "__all" : "paid")}
                    className={`rounded-md border px-2 py-2 text-[9px] font-medium transition-all duration-200 hover:shadow-sm ${
                      statusFilter === "paid"
                        ? "bg-green-50 border-green-200 font-semibold text-green-600"
                        : "bg-white border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                    }`}
                  >
                    Paid
                  </button>
                  <button
                    onClick={() => setStatusFilter(statusFilter === "cancelled" ? "__all" : "cancelled")}
                    className={`rounded-md border px-2 py-2 text-[9px] font-medium transition-all duration-200 hover:shadow-sm ${
                      statusFilter === "cancelled"
                        ? "bg-red-50 border-red-200 font-semibold text-red-600"
                        : "bg-white border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                    }`}
                  >
                    Cancelled
                  </button>
                </div>
              </div>
            </div>
            
            {/* Search Tools & Summary Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Input
                    placeholder="Search client, CS number, etc."
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    className="w-56 pl-3 pr-8 h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-muted p-4 rounded-lg text-center">
          <p className="text-xs">Total Filtered (Paid)</p>
          <p className="text-lg font-bold">
            ₱{totalAmount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-muted p-4 rounded-lg text-center">
          <p className="text-xs">Total Charge Slips</p>
          <p className="text-lg font-bold">{filteredRows.length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => {
                  const canSort = header.column.getCanSort?.();
                  const sort = header.column.getIsSorted?.(); // "asc" | "desc" | false
                  return (
                    <TableHead
                      key={header.id}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      className={canSort ? "cursor-pointer select-none" : undefined}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {canSort && (
                        <span className="ml-1 text-xs opacity-60">
                          {sort === "asc" ? "▲" : sort === "desc" ? "▼" : ""}
                        </span>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {filteredRows.length ? (
              filteredRows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/40">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex justify-end space-x-2">
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
  );
}