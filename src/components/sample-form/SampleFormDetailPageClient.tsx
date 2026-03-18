// src/components/sample-form/SampleFormDetailPageClient.tsx
// Admin detail view for a single sample form — mirrors QuotationDetailPageClient.
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Download, Eye, Loader2 } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { toast } from "sonner";
import { notFound } from "next/navigation";

import { getSampleFormById, markSampleFormAsReceived, markSampleFormAsReviewed } from "@/services/sampleFormService";
import { SampleFormRecord } from "@/types/SampleForm";
import { logActivity } from "@/services/activityLogService";
import useAuth from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SampleFormPDFViewer } from "./SampleFormPDFViewer";
import { SampleSubmissionFormPDF } from "@/components/pdf/SampleSubmissionFormPDF";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function toDateLabel(value: unknown): string {
  if (!value) return "—";
  const date = (value as any)?.toDate?.() ?? new Date(value as any);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-PH", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
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
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function SampleFormDetailPageClient() {
  const { adminInfo } = useAuth();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [form, setForm] = useState<SampleFormRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await getSampleFormById(id);
        setForm(data);
        await logActivity({
          userId: adminInfo?.email || "system",
          userEmail: adminInfo?.email || "system@pgc.admin",
          userName: adminInfo?.name || "System",
          action: "VIEW",
          entityType: "sample_form",
          entityId: id,
          entityName: `Sample Form ${id}`,
          description: `Viewed sample form: ${id}`,
        });
      } catch (err) {
        console.error("Error loading sample form:", err);
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleMarkReceived = async () => {
    if (!adminInfo?.email || !form) return;
    setProcessing(true);
    try {
      await markSampleFormAsReceived(form.id, adminInfo.email);
      setForm((prev) => prev ? { ...prev, status: "received" } : prev);
      toast.success("Marked as received.");
    } catch {
      toast.error("Failed to update status.");
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkReviewed = async () => {
    if (!adminInfo?.email || !form) return;
    setProcessing(true);
    try {
      await markSampleFormAsReviewed(form.id, adminInfo.email);
      setForm((prev) => prev ? { ...prev, status: "reviewed" } : prev);
      toast.success("Marked as reviewed.");
    } catch {
      toast.error("Failed to update status.");
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!form) return;
    setDownloading(true);
    try {
      const blob = await pdf(<SampleSubmissionFormPDF form={form} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${form.documentNumber || `PGCV-LF-SSF-${form.id.slice(0, 8)}`}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to generate PDF.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!form) return notFound();

  const docLabel = form.documentNumber || `PGCV-LF-SSF-${form.id.slice(0, 8)}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50/50 to-blue-50/30 p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#166FB5] to-[#4038AF] bg-clip-text text-transparent">
                Sample Form Details
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-slate-600">Document No:</span>
                <Badge
                  variant="outline"
                  className="font-mono text-[#F69122] border-[#F69122]/30 bg-[#F69122]/5"
                >
                  {docLabel}
                </Badge>
                {statusBadge(form.status)}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push("/admin/sample-forms")}
              className="hover:bg-slate-50"
            >
              ← Back to List
            </Button>
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Project / Submission */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50 space-y-3">
            <h2 className="font-semibold text-slate-800">Submission Info</h2>
            <dl className="text-sm space-y-2">
              <div className="flex justify-between">
                <dt className="text-slate-500">Project ID</dt>
                <dd className="font-medium">{form.projectId}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Project Title</dt>
                <dd className="font-medium">{form.projectTitle || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Submitted By</dt>
                <dd className="font-medium">
                  {form.submittedByName || form.submittedByEmail}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Submitted At</dt>
                <dd>{toDateLabel(form.createdAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Total Samples</dt>
                <dd className="font-medium">{form.totalNumberOfSamples}</dd>
              </div>
            </dl>
          </div>

          {/* Workflow */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50 space-y-3">
            <h2 className="font-semibold text-slate-800">Workflow Status</h2>
            <dl className="text-sm space-y-2">
              <div className="flex justify-between">
                <dt className="text-slate-500">Current Status</dt>
                <dd>{statusBadge(form.status)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Received By</dt>
                <dd>{form.adminReceivedBy || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Received At</dt>
                <dd>{toDateLabel(form.adminReceivedAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Reviewed By</dt>
                <dd>{form.reviewedBy || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Reviewed At</dt>
                <dd>{toDateLabel(form.reviewedAt)}</dd>
              </div>
            </dl>

            {/* Status actions */}
            <div className="flex gap-2 pt-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Download className="h-4 w-4 mr-1" />
                )}
                Download PDF
              </Button>

              <Button
                size="sm"
                onClick={() =>
                  window.open(`/api/sample-forms/pdf?id=${form.id}`, "_blank")
                }
                variant="outline"
              >
                <Eye className="h-4 w-4 mr-1" />
                View Stored PDF
              </Button>

              {form.status === "submitted" && (
                <Button
                  size="sm"
                  onClick={handleMarkReceived}
                  disabled={processing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {processing && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  Mark Received
                </Button>
              )}

              {form.status !== "reviewed" && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleMarkReviewed}
                  disabled={processing}
                >
                  {processing && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  Mark Reviewed
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* PDF Preview */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
          <h2 className="font-semibold text-slate-800 mb-4">PDF Preview</h2>
          <SampleFormPDFViewer form={form} />
        </div>
      </div>
    </div>
  );
}
