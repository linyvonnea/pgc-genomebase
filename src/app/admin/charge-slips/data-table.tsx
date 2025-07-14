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
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("__all");

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
    return table.getRowModel().rows.filter((row) => {
      const matchesSearch = row
        .getAllCells()
        .some((cell) =>
          String(cell.getValue())
            .toLowerCase()
            .includes(globalFilter.toLowerCase())
        );

      const matchesStatus =
        statusFilter === "__all" || row.original.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [table, globalFilter, statusFilter]);

  const totalAmount = useMemo(() => {
    return filteredRows.reduce((sum, row) => sum + (row.original.total || 0), 0);
  }, [filteredRows]);

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-muted p-4 rounded-lg text-center">
          <p className="text-xs">Total Filtered</p>
          <p className="text-lg font-bold">₱{totalAmount.toLocaleString()}</p>
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
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {filteredRows.length ? (
              filteredRows.map((row) => (
                <TableRow
                  key={row.id}
                  className="hover:bg-muted/40 cursor-pointer"
                >
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