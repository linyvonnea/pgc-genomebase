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

  return (
    <div className="space-y-4">
      {/* Search + Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Input
          placeholder="Search client, CS number, etc."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="w-72"
        />

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All Statuses</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Category Checkboxes */}
      <div className="flex flex-wrap items-center gap-6 p-3 bg-muted/30 rounded-lg border border-dashed">
        <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Service Requested:
        </span>
        <div className="flex flex-wrap gap-4">
          {allCategories.map((cat) => (
            <div key={cat} className="flex items-center space-x-2">
              <Checkbox
                id={`cat-${cat}`}
                checked={categoryFilters.includes(cat)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setCategoryFilters((prev) => [...prev, cat]);
                  } else {
                    setCategoryFilters((prev) => prev.filter((c) => c !== cat));
                  }
                }}
              />
              <Label
                htmlFor={`cat-${cat}`}
                className="text-sm font-medium leading-none cursor-pointer capitalize"
              >
                {cat}
              </Label>
            </div>
          ))}
          {categoryFilters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCategoryFilters([])}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
            >
              Reset Filters
            </Button>
          )}
        </div>
      </div>

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