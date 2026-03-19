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
        </div>
      </div>

      {/* Main content - PDF Preview */}
      <Card className="border-slate-200 shadow-sm overflow-hidden min-h-[800px] flex flex-col">
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
