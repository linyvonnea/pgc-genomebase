// src/components/sample-form/SampleFormHistoryPanel.tsx
// Shows submitted sample forms for a project — mirrors QuotationHistoryPanel.
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { pdf } from "@react-pdf/renderer";
import { Download, Eye, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { getSampleFormsByProjectId, getSampleFormById } from "@/services/sampleFormService";
import { SampleFormRecord, SampleFormSummary } from "@/types/SampleForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SampleFormPDFViewer } from "./SampleFormPDFViewer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SampleSubmissionFormPDF } from "@/components/pdf/SampleSubmissionFormPDF";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function toDateLabel(value: unknown): string {
  if (!value) return "—";
  const date = (value as any)?.toDate?.() ?? new Date(value as any);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusVariant(
  status: SampleFormSummary["status"]
): "default" | "secondary" | "outline" {
  if (status === "reviewed") return "default";
  if (status === "received") return "secondary";
  return "outline";
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface SampleFormHistoryPanelProps {
  projectId: string;
  /** When supplied, only forms from this email are shown */
  submittedByEmail?: string;
  /** Whether to include submitted-only forms (default: false — admins only) */
  includeSubmittedStatus?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function SampleFormHistoryPanel({
  projectId,
  submittedByEmail,
  includeSubmittedStatus = false,
}: SampleFormHistoryPanelProps) {
  const [previewForm, setPreviewForm] = useState<SampleFormRecord | null>(null);
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const includeStatuses: Array<"submitted" | "received" | "reviewed"> = includeSubmittedStatus
    ? ["submitted", "received", "reviewed"]
    : ["received", "reviewed"];

  const { data: forms = [], isLoading } = useQuery({
    queryKey: ["sampleFormHistory", projectId, submittedByEmail, includeSubmittedStatus],
    queryFn: () =>
      getSampleFormsByProjectId(projectId, { submittedByEmail, includeStatuses }),
    enabled: !!projectId,
  });

  const handleOpenPreview = async (formId: string) => {
    setLoadingPreviewId(formId);
    try {
      const record = await getSampleFormById(formId);
      if (!record) { toast.error("Form not found."); return; }
      setPreviewForm(record);
    } catch {
      toast.error("Failed to load form for preview.");
    } finally {
      setLoadingPreviewId(null);
    }
  };

  const handleDownload = async (summary: SampleFormSummary) => {
    setDownloadingId(summary.id);
    try {
      const record = await getSampleFormById(summary.id);
      if (!record) { toast.error("Form not found."); return; }
      const blob = await pdf(<SampleSubmissionFormPDF form={record} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${record.documentNumber || `PGCV-LF-SSF-${record.id.slice(0, 8)}`}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to generate PDF.");
    } finally {
      setDownloadingId(null);
    }
  };

  if (!projectId) {
    return (
      <p className="text-sm text-muted-foreground">No project information available.</p>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
      </div>
    );
  }

  if (forms.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No sample forms submitted yet for project <code>{projectId}</code>.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {forms.map((form) => (
        <div
          key={form.id}
          className="flex items-center justify-between gap-3 rounded-lg border bg-white p-3"
        >
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 shrink-0 text-[#166FB5]" />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate text-slate-800">
                {form.documentNumber || `PGCV-LF-SSF-${form.id.slice(0, 8)}`}
              </p>
              <p className="text-xs text-slate-500">
                {form.totalNumberOfSamples} sample{form.totalNumberOfSamples !== 1 ? "s" : ""} ·{" "}
                {toDateLabel(form.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={statusVariant(form.status)} className="capitalize text-xs">
              {form.status ?? "submitted"}
            </Badge>

            {/* Preview dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenPreview(form.id)}
                  disabled={loadingPreviewId === form.id}
                >
                  {loadingPreviewId === form.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </Button>
              </DialogTrigger>
              {previewForm?.id === form.id && (
                <DialogContent className="max-w-5xl w-full">
                  <DialogHeader>
                    <DialogTitle>
                      {previewForm.documentNumber ?? "Sample Form"} — Preview
                    </DialogTitle>
                  </DialogHeader>
                  <SampleFormPDFViewer form={previewForm} />
                </DialogContent>
              )}
            </Dialog>

            {/* Download */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload(form)}
              disabled={downloadingId === form.id}
            >
              {downloadingId === form.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
