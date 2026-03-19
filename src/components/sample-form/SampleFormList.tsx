// src/components/sample-form/SampleFormList.tsx
// Reusable admin table — mirrors QuotationList.tsx.
// The parent page owns data fetching; this component only renders.
"use client";

import { CheckCircle2, Download, Eye, FileText, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SampleFormRecord } from "@/types/SampleForm";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function toDateLabel(value: unknown): string {
  if (!value) return "—";
  const date = (value as any)?.toDate?.() ?? new Date(value as any);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(status: SampleFormRecord["status"]) {
  if (status === "reviewed")
    return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Reviewed</Badge>;
  if (status === "received")
    return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Received</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Submitted</Badge>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface SampleFormListProps {
  records: SampleFormRecord[];
  loading?: boolean;
  processingId?: string | null;
  downloadingId?: string | null;
  onViewPdf: (item: SampleFormRecord) => void;
  onDownload: (item: SampleFormRecord) => void;
  onMarkReceived: (item: SampleFormRecord) => void;
  onMarkReviewed: (item: SampleFormRecord) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function SampleFormList({
  records,
  loading = false,
  processingId,
  downloadingId,
  onViewPdf,
  onDownload,
  onMarkReceived,
  onMarkReviewed,
}: SampleFormListProps) {
  if (loading) {
    return (
      <div className="py-10 text-center text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
        Loading sample forms…
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="py-10 text-center text-slate-500">
        No sample forms found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {records.map((item) => {
        const busy = processingId === item.id;
        const docLabel =
          item.documentNumber || `PGCV-LF-SSF-${item.id.slice(0, 8)}`;

        return (
          <div
            key={item.id}
            className="border rounded-lg p-3 bg-white transition-shadow hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              {/* Meta */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <FileText className="h-4 w-4 text-[#166FB5]" />
                  <span className="font-semibold text-sm text-slate-800">{docLabel}</span>
                  {statusBadge(item.status)}
                </div>
                <p className="text-xs text-slate-500">
                  Project: {item.projectTitle || "Untitled"} ({item.projectId})
                </p>
                <p className="text-xs text-slate-500">
                  Submitted by: {item.submittedByName || item.submittedByEmail}
                </p>
                <p className="text-xs text-slate-500">
                  Samples: {item.totalNumberOfSamples} · Created:{" "}
                  {toDateLabel(item.createdAt)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => onViewPdf(item)}>
                  <Eye className="h-4 w-4 mr-1" />
                  View PDF
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDownload(item)}
                  disabled={downloadingId === item.id}
                >
                  {downloadingId === item.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Download className="h-4 w-4 mr-1" />
                  )}
                  Download
                </Button>

                {item.status === "submitted" && (
                  <Button
                    size="sm"
                    onClick={() => onMarkReceived(item)}
                    disabled={busy}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                    )}
                    Mark Received
                  </Button>
                )}

                {item.status !== "reviewed" && (
                  <Button
                    size="sm"
                    onClick={() => onMarkReviewed(item)}
                    disabled={busy}
                    variant="secondary"
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                    )}
                    Mark Reviewed
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
