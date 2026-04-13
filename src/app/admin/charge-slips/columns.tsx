"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { UIChargeSlipRecord } from "@/types/UIChargeSlipRecord";
import { Badge } from "@/components/ui/badge";
import { ValidCategory } from "@/types/ValidCategory";
import { Trash2, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteChargeSlip } from "@/services/chargeSlipService";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ChargeSlipButton } from "../clients/ChargeSlipButton";
import { usePermissions } from "@/hooks/usePermissions";
import useAuth from "@/hooks/useAuth";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Badge colors for statuses
const statusColors: Record<string, string> = {
  processing: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

// Badge colors for categories
const categoryColors: Record<ValidCategory, string> = {
  laboratory: "bg-green-100 text-green-800",
  equipment: "bg-blue-100 text-blue-800",
  bioinformatics: "bg-purple-100 text-purple-800",
  retail: "bg-orange-100 text-orange-800",
  training: "bg-indigo-100 text-indigo-800",
};

// normalize to epoch ms for proper numeric sorting
function toMillis(v: unknown): number {
  if (!v) return NaN;
  if (typeof v === "number") return v;
  if (typeof v === "string") return new Date(v).getTime();
  const anyV = v as any;
  if (typeof anyV?.toDate === "function") return anyV.toDate().getTime(); // Firestore Timestamp
  if (v instanceof Date) return v.getTime();
  return NaN;
}

const ActionCell = ({ row }: { row: any }) => {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const { adminInfo } = useAuth();
  const { canEdit, canCreate, canDelete } = usePermissions(adminInfo?.role);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering any row click navigation
    if (!window.confirm(`Are you sure you want to delete charge slip ${row.original.chargeSlipNumber}?`)) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteChargeSlip(row.original.chargeSlipNumber);
      toast.success("Charge slip deleted successfully");
      router.refresh(); // Tells Next.js to re-fetch Server Components data
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete charge slip");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-1 justify-end pr-2">
      {canDelete("chargeSlips") && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export const columns: ColumnDef<UIChargeSlipRecord, any>[] = [
  {
    id: "dateIssued",
    header: "Date",
    accessorFn: (row) => toMillis((row as any).dateIssued),
    size: 100, // Slightly increased for MM-DD-YYYY
    cell: ({ getValue }) => {
      const ms = getValue<number>();
      if (isNaN(ms)) return <div className="text-xs text-muted-foreground">—</div>;
      const date = new Date(ms);
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const yyyy = date.getFullYear();
      return <div className="text-xs font-mono tabular-nums">{`${mm}-${dd}-${yyyy}`}</div>;
    },
    sortDescFirst: true,
  },
  {
    accessorKey: "chargeSlipNumber",
    header: "Charge Slip No.",
    size: 150,
    cell: ({ getValue, row }) => (
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-xs font-semibold">{getValue<string>()}</span>
        {row.original.hasNewOR && (
          <Badge variant="destructive" className="h-3.5 px-1 text-[7px] animate-pulse shrink-0">
            OR
          </Badge>
        )}
      </div>
    ),
  },
  {
    accessorFn: (row) => row.clientInfo?.name,
    id: "clientInfo.name",
    header: "Client Name",
    size: 180,
    cell: ({ getValue }) => {
      const name = getValue() as string || "—";
      return (
        <div className="max-w-[180px] truncate text-xs font-medium" title={name}>
          {name}
        </div>
      );
    },
  },
  {
    accessorKey: "total",
    header: () => <div className="text-right">Amount</div>,
    size: 110,
    cell: ({ row }) => {
      const value = Number(row.getValue("total") ?? 0);
      return (
        <div className="text-right font-semibold text-xs">
          ₱{value.toLocaleString("en-PH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    size: 100,
    cell: ({ row }) => {
      const raw = String(row.getValue("status") ?? "processing").toLowerCase();
      const color = statusColors[raw] || "bg-gray-100 text-gray-800";
      const hasNewOR = row.original.hasNewOR;

      return (
        <div className="flex items-center gap-2">
          <Badge className={`capitalize text-[10px] h-5 px-2 ${color} hover:${color} shadow-none`}>
            {raw}
          </Badge>
          {hasNewOR && (
            <TooltipProvider>
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <div className="flex items-center">
                    <div className="relative flex">
                      <div className="absolute inset-0 rounded-full bg-rose-400 animate-ping opacity-75" />
                      <FileWarning className="h-4 w-4 text-rose-500 relative z-10" />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-rose-600 text-white border-none text-[11px] font-medium py-1.5 px-3">
                  <p>Client has uploaded a new Official Receipt for validation</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "categories",
    header: "Service Requested",
    size: 180,
    cell: ({ row }) => {
      const categories = (row.getValue("categories") as ValidCategory[] | undefined) ?? [];
      if (!categories.length) return <span className="text-muted-foreground text-xs">—</span>;
      return (
        <div className="flex flex-wrap gap-1 max-w-[180px]">
          {categories.slice(0, 2).map((cat) => (
            <span
              key={cat}
              className={`px-1.5 py-0.5 rounded text-[9px] font-medium border capitalize ${categoryColors[cat] ?? "bg-gray-50 border-gray-200 text-gray-700"}`}
            >
              {cat}
            </span>
          ))}
          {categories.length > 2 && (
            <span className="text-[9px] text-muted-foreground">+{categories.length - 2}</span>
          )}
        </div>
      );
    },
  },
  {
    accessorFn: (row) => row.project?.title,
    id: "project.title",
    header: "Payment For",
    size: 200,
    cell: ({ getValue }) => {
      const title = getValue() as string || "—";
      return (
        <div className="max-w-[200px] truncate text-xs" title={title}>
          {title}
        </div>
      );
    },
  },
  {
    accessorFn: (row) => row.preparedBy?.name,
    id: "preparedBy.name",
    header: "Prepared By",
    size: 140,
    cell: ({ getValue }) => {
      const name = getValue() as string || "—";
      return (
        <div className="max-w-[140px] truncate text-left text-xs" title={name}>
          {name}
        </div>
      );
    },
  },
  {
    id: "actions",
    header: () => <div className="text-right pr-4 tracking-tight">Actions</div>,
    cell: ({ row }) => <ActionCell row={row} />,
    size: 150,
  },
];