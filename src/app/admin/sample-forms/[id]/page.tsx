import { getSampleFormById } from "@/services/sampleFormService";
import { SampleFormRecord } from "@/types/SampleForm";
import { notFound } from "next/navigation";
import { SamplePDFViewer } from "@/components/pdf/SamplePDFViewer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import Link from "next/link";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import SampleDownloadButton from "@/components/pdf/SampleDownloadButton";

export default async function SampleFormDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = await getSampleFormById(id);

  if (!record) {
    notFound();
  }

  // Serialize Firestore Timestamps so the record is safe to pass to client components
  const serializeDate = (val: any): string | undefined => {
    if (!val) return undefined;
    if (typeof val === "string") return val;
    if (val?.toDate) return val.toDate().toISOString();
    if (val instanceof Date) return val.toISOString();
    return String(val);
  };
  const safeRecord: SampleFormRecord = {
    ...record,
    createdAt: serializeDate(record.createdAt),
    updatedAt: serializeDate(record.updatedAt),
  };

  const formatDate = (date: any) => {
    if (!date) return "—";
    try {
      if (typeof date === "string") return format(new Date(date), "MM-dd-yyyy");
      if (date?.toDate) return format(date.toDate(), "MM-dd-yyyy");
      return format(new Date(date), "MM-dd-yyyy");
    } catch (e) {
      return "—";
    }
  };

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
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      {/* Back navigation */}
      <Link 
        href="/admin/sample-forms" 
        className="inline-flex items-center text-sm text-slate-500 hover:text-blue-600 transition-colors gap-1 mb-2"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Sample Forms List
      </Link>

      {/* Header section with actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{record.formId || record.id}</h1>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {record.status || "Submitted"}
            </Badge>
          </div>
          <p className="text-slate-500 text-sm">
            Submitted on {formatDate(record.createdAt)} by {record.submittedByName}
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button
            variant="outline"
            className="flex-1 md:flex-none border-slate-200"
            asChild
          >
            <a 
              href={`/api/generate-sample-form-pdf/${id}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Download PDF
            </a>
          </Button>
          <div className="hidden md:block">
            {/* Client-side modal preview + download */}
            <SampleDownloadButton record={safeRecord} />
          </div>
        </div>
      </div>

      {/* Sample details summary */}
      <Card className="border-slate-200 shadow-sm p-6 space-y-5">
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
            <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Total Number of Samples</p>
            <p className="text-sm font-medium text-slate-900">{record.totalNumberOfSamples ?? 0}</p>
          </div>
        </div>

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
              <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Forward Primer Sequence</p>
              <p className="text-sm text-slate-700 break-all">{record.ampliconDetails?.forwardPrimerSequence || "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Reverse Primer Sequence</p>
              <p className="text-sm text-slate-700 break-all">{record.ampliconDetails?.reversePrimerSequence || "—"}</p>
            </div>
          </div>
        </div>

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
                      <td className="border-b border-slate-100 px-3 py-2 text-slate-600">{entry.row || index + 1}</td>
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
        </div>
      </Card>

      {/* Main content - PDF Preview */}
      <Card id="pdf-preview" className="border-slate-200 shadow-sm overflow-hidden min-h-[800px] flex flex-col scroll-mt-24">
        <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Document Preview</h2>
        </div>
        <div className="flex-1 bg-slate-100/50 p-4 md:p-8">
          <div className="h-full bg-white shadow-xl rounded-sm overflow-hidden max-w-5xl mx-auto border border-slate-200">
            <SamplePDFViewer record={safeRecord} />
          </div>
        </div>
      </Card>
    </div>
  );
}
