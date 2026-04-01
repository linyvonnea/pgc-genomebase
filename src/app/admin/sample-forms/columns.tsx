"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { SampleFormRecord } from "@/types/SampleForm";
import { cn } from "@/lib/utils";
import Link from "next/link";

function PreviewPDFCell({ record }: { record: SampleFormRecord }) {
  const [open, setOpen] = useState(false);
  const formId = record.formId || record.sfid || record.id;
  const pdfUrl = `/api/generate-sample-form-pdf/${encodeURIComponent(formId)}`;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-blue-700 border-blue-200 hover:bg-blue-50"
        onClick={() => setOpen(true)}
      >
        Preview PDF
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-5xl w-full h-[90vh] flex flex-col p-0 gap-0"
          aria-describedby="sample-form-pdf-desc"
        >
          <div id="sample-form-pdf-desc" className="sr-only">
            PDF preview of sample submission form {formId}.
          </div>
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle className="text-base font-semibold">
              {formId}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <iframe
              src={pdfUrl}
              style={{ width: "100%", height: "100%", border: "none" }}
              title={`Sample Form PDF — ${formId}`}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const columns: ColumnDef<SampleFormRecord>[] = [
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => {
      const date = row.getValue("createdAt") as Date;
      if (!date) return "—";
      return <span className="text-slate-600">{format(date, "MM-dd-yyyy")}</span>;
    },
  },
  {
    accessorKey: "formId",
    header: "ID",
    cell: ({ row }) => {
      const id = row.getValue("formId") as string;
      return (
        <Link
          href={`/admin/sample-forms/new?formId=${encodeURIComponent(id || row.original.id)}`}
          className="font-medium text-blue-600 hover:text-blue-800 transition-colors"
        >
          {id || row.original.id}
        </Link>
      );
    },
  },
  {
    accessorKey: "submittedByName",
    header: "Client",
    cell: ({ row }) => {
      const name = row.getValue("submittedByName") as string;
      const email = row.original.submittedByEmail;
      return (
        <div className="flex flex-col">
          <span className="font-medium text-slate-900">{name || "—"}</span>
          <span className="text-xs text-slate-500">{email}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "projectTitle",
    header: "Project",
    cell: ({ row }) => {
      const title = row.getValue("projectTitle") as string;
      return <span className="max-w-[300px] truncate block text-slate-600" title={title}>{title || "—"}</span>;
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = (row.getValue("status") as string) || "Submitted";
      return (
        <Badge
          className={cn(
            "font-semibold",
            status === "Approved" && "bg-green-100 text-green-700 hover:bg-green-100 border-0",
            status === "Reviewed" && "bg-blue-100 text-blue-700 hover:bg-blue-100 border-0",
            status === "Submitted" && "bg-amber-100 text-amber-700 hover:bg-amber-100 border-0"
          )}
        >
          {status}
        </Badge>
      );
    },
  },
  {
    id: "action",
    header: "Action",
    cell: ({ row }) => <SampleFormPreviewButton record={row.original} />,
  },
];
