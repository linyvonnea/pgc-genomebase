// src/app/admin/sample-forms/new/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getSampleFormById } from "@/services/sampleFormService";
import { SampleFormRecord } from "@/types/SampleForm";
import { Timestamp } from "firebase/firestore";
import { format } from "date-fns";
import { ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import SampleFormPreviewButton from "@/components/pdf/SampleFormPreviewButton";

// Serialize Firestore Timestamps so they're safe to pass to client components
function serializeDate(val: any): string | undefined {
  if (!val) return undefined;
  if (typeof val === "string") return val;
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

function formatDate(date: any) {
  if (!date) return "—";
  try {
    return format(new Date(date), "MM-dd-yyyy");
  } catch {
    return "—";
  }
}

export default function SampleFormPreviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formId = searchParams.get("formId");

  const [record, setRecord] = useState<SampleFormRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!formId) {
      setError("No formId provided in URL.");
      setLoading(false);
      return;
    }

    getSampleFormById(formId)
      .then((data) => {
        if (!data) {
          setError(`Sample form "${formId}" not found.`);
          return;
        }

        // Normalize timestamps before passing to client components
        setRecord({
          ...data,
          createdAt: serializeDate(data.createdAt),
          updatedAt: serializeDate(data.updatedAt),
        });
      })
      .catch((err) => {
        console.error("Failed to fetch sample form:", err);
        setError("Failed to load sample form. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [formId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#166FB5]" />
          <p className="text-sm text-slate-500">Loading sample form…</p>
        </div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="container mx-auto p-8 max-w-2xl text-center space-y-4">
        <p className="text-red-600 font-medium">{error ?? "Record not found."}</p>
        <Link
          href="/admin/sample-forms"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Sample Forms
        </Link>
      </div>
    );
  }

  const sampleSourceLabels = [
    record.sampleSource?.fish ? "Fish" : null,
    record.sampleSource?.crustacean ? "Crustacean" : null,
    record.sampleSource?.plant ? "Plant" : null,
    record.sampleSource?.animal ? "Animal" : null,
    record.sampleSource?.others
      ? `Others${record.sampleSource?.othersText ? `: ${record.sampleSource.othersText}` : ""}`
      : null,
  ].filter(Boolean) as string[];

  const templateTypeLabels = [
    record.templateType?.tissue ? "Tissue" : null,
    record.templateType?.blood ? "Blood" : null,
    record.templateType?.bacteria ? "Bacteria" : null,
    record.templateType?.genomicDNA ? "Genomic DNA" : null,
    record.templateType?.totalRNA ? "Total RNA" : null,
    record.templateType?.cDNA ? "cDNA" : null,
    record.templateType?.pcrProduct ? "PCR Product" : null,
    record.templateType?.environmentalSample
      ? `Environmental Sample${record.templateType?.environmentalSampleText ? `: ${record.templateType.environmentalSampleText}` : ""}`
      : null,
  ].filter(Boolean) as string[];

  const entries = Array.isArray(record.entries) ? record.entries : [];

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6 max-w-7xl">
      {/* Back navigation */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/admin/sample-forms"
          className="inline-flex items-center text-sm text-slate-500 hover:text-blue-600 transition-colors gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Sample Forms List
        </Link>
      </div>

      {/* Header: Form ID + status */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              {record.formId || record.sfid || record.id}
            </h1>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {record.status || "Submitted"}
            </Badge>
          </div>
          <p className="text-slate-500 text-sm">
            Submitted on {formatDate(record.createdAt)}
            {record.submittedByName ? ` by ${record.submittedByName}` : ""}
          </p>
        </div>
      </div>

      {/* Sample details summary */}
      <Card className="border-slate-200 shadow-sm p-6 space-y-5">
        {/* Row 1 — key IDs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Form ID</p>
            <p className="text-sm font-medium text-slate-900">{record.formId || record.id}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Inquiry ID</p>
            <p className="text-sm font-medium text-slate-900">{record.inquiryId || "—"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Project ID</p>
            <p className="text-sm font-medium text-slate-900">{record.projectId || "—"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Total Samples</p>
            <p className="text-sm font-medium text-slate-900">{record.totalNumberOfSamples ?? 0}</p>
          </div>
        </div>

        {/* Row 2 — submission + project context */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-200 p-4 space-y-2">
            <h3 className="text-sm font-semibold text-slate-800">Submission Details</h3>
            <p className="text-sm text-slate-600">
              <span className="font-medium text-slate-800">Submitted By:</span>{" "}
              {record.submittedByName || "—"}
            </p>
            <p className="text-sm text-slate-600">
              <span className="font-medium text-slate-800">Email:</span>{" "}
              {record.submittedByEmail || "—"}
            </p>
            <p className="text-sm text-slate-600">
              <span className="font-medium text-slate-800">Created:</span>{" "}
              {formatDate(record.createdAt)}
            </p>
            <p className="text-sm text-slate-600">
              <span className="font-medium text-slate-800">Updated:</span>{" "}
              {formatDate(record.updatedAt)}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 p-4 space-y-2">
            <h3 className="text-sm font-semibold text-slate-800">Project Context</h3>
            <p className="text-sm text-slate-600">
              <span className="font-medium text-slate-800">Project Title:</span>{" "}
              {record.projectTitle || "—"}
            </p>
            <p className="text-sm text-slate-600">
              <span className="font-medium text-slate-800">Client ID:</span>{" "}
              {record.clientId || "—"}
            </p>
            <p className="text-sm text-slate-600">
              <span className="font-medium text-slate-800">Status:</span>{" "}
              {record.status || "Submitted"}
            </p>
          </div>
        </div>

        {/* Row 3 — Source & Template */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-200 p-4 space-y-2">
            <h3 className="text-sm font-semibold text-slate-800">Sample Source</h3>
            {sampleSourceLabels.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {sampleSourceLabels.map((label) => (
                  <Badge key={label} variant="secondary" className="bg-slate-100 text-slate-700">
                    {label}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No sample source selected.</p>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 p-4 space-y-2">
            <h3 className="text-sm font-semibold text-slate-800">Template Type</h3>
            {templateTypeLabels.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {templateTypeLabels.map((label) => (
                  <Badge key={label} variant="secondary" className="bg-slate-100 text-slate-700">
                    {label}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No template type selected.</p>
            )}
          </div>
        </div>

        {/* Row 4 — Amplicon details */}
        <div className="rounded-lg border border-slate-200 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-800">Amplicon Sequencing Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Target Gene(s)</p>
              <p className="text-sm text-slate-700">{record.ampliconDetails?.targetGenes || "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Target Gene Size</p>
              <p className="text-sm text-slate-700">{record.ampliconDetails?.targetGeneSize || "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Forward Primer</p>
              <p className="text-sm text-slate-700 break-all">{record.ampliconDetails?.forwardPrimerSequence || "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Reverse Primer</p>
              <p className="text-sm text-slate-700 break-all">{record.ampliconDetails?.reversePrimerSequence || "—"}</p>
            </div>
          </div>
        </div>

        {/* Row 5 — Sample Template Matrix with Preview PDF button */}
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/60">
            <h3 className="text-sm font-semibold text-slate-800">Sample Template Matrix</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm border-collapse">
              <thead>
                <tr className="bg-white text-slate-700">
                  <th className="border-b border-slate-200 px-3 py-2 text-left w-16">#</th>
                  <th className="border-b border-slate-200 px-3 py-2 text-left">Sample Code</th>
                  <th className="border-b border-slate-200 px-3 py-2 text-left">Concentration</th>
                  <th className="border-b border-slate-200 px-3 py-2 text-left">Volume</th>
                  <th className="border-b border-slate-200 px-3 py-2 text-left">Notes</th>
                </tr>
              </thead>
              <tbody>
                {entries.length > 0 ? (
                  entries.map((entry, index) => (
                    <tr key={`${entry.row}-${index}`} className="odd:bg-slate-50/30">
                      <td className="border-b border-slate-100 px-3 py-2 text-slate-600">{entry.row ?? index + 1}</td>
                      <td className="border-b border-slate-100 px-3 py-2 text-slate-700">{entry.sampleCode || "—"}</td>
                      <td className="border-b border-slate-100 px-3 py-2 text-slate-700">{entry.concentration || "—"}</td>
                      <td className="border-b border-slate-100 px-3 py-2 text-slate-700">{entry.volume || "—"}</td>
                      <td className="border-b border-slate-100 px-3 py-2 text-slate-700">{entry.notes || "—"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                      No sample entries available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Preview PDF button — bottom-right of the table */}
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/30 flex justify-end">
            <SampleFormPreviewButton record={record} />
          </div>
        </div>
      </Card>
    </div>
  );
}
