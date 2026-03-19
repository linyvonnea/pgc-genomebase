"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { 
  ChevronsLeft, 
  ChevronsRight, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  FilterX,
  X,
  Printer,
  ExternalLink,
  Loader2
} from "lucide-react";
import { SampleFormRecord } from "@/types/SampleForm";
import { columns as defaultColumns } from "./columns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import dynamic from "next/dynamic";

const SampleFormPDFPreview = dynamic(
  () => import("@/components/pdf/SampleFormPDFPreview"),
  { 
    ssr: false, 
    loading: () => <div className="h-[600px] w-full flex items-center justify-center bg-white rounded-lg border border-slate-200">
      <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
    </div> 
  }
);

interface Props {
  data: SampleFormRecord[];
  columns?: ColumnDef<SampleFormRecord, any>[];
}

export function SampleFormClientTable({ data, columns = defaultColumns }: Props) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleViewPDF = (id: string) => {
    setSelectedFormId(id);
    setIsPreviewOpen(true);
  };

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    state: {
      sorting,
      globalFilter,
      pagination,
    },
    meta: {
      onViewPDF: handleViewPDF,
    }
  });

  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
      {/* PDF Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl bg-slate-900/5 backdrop-blur-sm">
          <DialogHeader className="p-4 bg-white border-b flex-row justify-between items-center shrink-0">
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900">Document Preview</DialogTitle>
              <DialogDescription className="text-slate-500">
                Previewing Sample Submission Form
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 pr-8">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 gap-2 border-slate-200 text-slate-700 hover:bg-slate-50"
                onClick={() => window.open(`/api/generate-sample-form-pdf/${selectedFormId}`, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
                Open in New Tab
              </Button>
            </div>
          </DialogHeader>
          
          <div className="flex-1 bg-slate-100/50 p-4 md:p-8 overflow-auto flex justify-center">
            {selectedFormId ? (
              <div className="w-full max-w-4xl h-full shadow-2xl rounded-sm overflow-hidden bg-white">
                <SampleFormPDFPreview id={selectedFormId} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm font-medium">Loading preview...</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="p-4 bg-slate-50/50 border-b border-slate-200">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by ID, client, or project..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9 bg-white border-slate-200 focus:ring-blue-100 h-10 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
             {globalFilter && (
               <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setGlobalFilter("")}
                className="text-slate-500 hover:text-slate-800 h-9 px-3"
               >
                 <FilterX className="h-4 w-4 mr-2" />
                 Clear search
               </Button>
             )}
             <Select
              value={`${pagination.pageSize}`}
              onValueChange={(val) => table.setPageSize(Number(val))}
            >
              <SelectTrigger className="w-[110px] bg-white h-10 text-sm">
                <SelectValue placeholder="Page Size" />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50].map((size) => (
                  <SelectItem key={size} value={`${size}`}>
                    {size} rows
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto relative min-h-[400px]">
        <Table>
          <TableHeader className="bg-slate-50/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-slate-200">
                {headerGroup.headers.map((header) => (
                  <TableHead 
                    key={header.id} 
                    className="text-slate-600 font-semibold py-4 px-6 text-sm"
                  >
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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="group hover:bg-slate-50 border-slate-100 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-4 px-6 text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-64 text-center"
                >
                  <div className="flex flex-col items-center justify-center space-y-2 opacity-50 grayscale">
                    <Search className="h-10 w-10 text-slate-300" />
                    <div className="text-slate-400 font-medium">No sample forms found.</div>
                    <div className="text-slate-400 text-xs">Try adjusting your search filters.</div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Container */}
      <div className="flex items-center justify-between p-4 bg-slate-50/50 border-t border-slate-200">
        <div className="text-xs text-slate-400 font-medium">
          Showing {table.getRowModel().rows.length} of {data.length} records
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-8 w-8 p-0 border-slate-200 hover:bg-white text-slate-600 shadow-sm disabled:opacity-50"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0 border-slate-200 hover:bg-white text-slate-600 shadow-sm disabled:opacity-50"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center justify-center min-w-[80px] text-xs font-semibold text-slate-700 mx-1">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount() || 1}
          </div>
          <Button
            variant="outline"
            className="h-8 w-8 p-0 border-slate-200 hover:bg-white text-slate-600 shadow-sm disabled:opacity-50"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0 border-slate-200 hover:bg-white text-slate-600 shadow-sm disabled:opacity-50"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
