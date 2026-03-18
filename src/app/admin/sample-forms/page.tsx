"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SampleFormRecord } from "@/types/SampleForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import useAuth from "@/hooks/useAuth";
import { markSampleFormAsReceived, markSampleFormAsReviewed } from "@/services/sampleFormService";
import { Search } from "lucide-react";
import { PermissionGuard } from "@/components/PermissionGuard";
import { pdf } from "@react-pdf/renderer";
import { SampleSubmissionFormPDF } from "@/components/pdf/SampleSubmissionFormPDF";
import { SampleFormList } from "@/components/sample-form/SampleFormList";

export default function AdminSampleFormsPage() {
  return (
    <PermissionGuard module="chargeSlips" action="view">
      <AdminSampleFormsContent />
    </PermissionGuard>
  );
}

function AdminSampleFormsContent() {
  const { adminInfo } = useAuth();
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [records, setRecords] = useState<SampleFormRecord[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "sampleForms"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const mapped = snapshot.docs.map((item) => ({
        id: item.id,
        ...(item.data() as Omit<SampleFormRecord, "id">),
      })) as SampleFormRecord[];
      setRecords(mapped);
    } catch (error) {
      console.error("Error loading sample forms:", error);
      toast.error("Failed to load sample forms.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((item) =>
      [item.documentNumber, item.submittedByEmail, item.submittedByName,
       item.projectId, item.projectTitle, item.status]
        .filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [records, search]);

  const handleReceive = async (item: SampleFormRecord) => {
    if (!adminInfo?.email) { toast.error("Admin identity missing."); return; }
    setProcessingId(item.id);
    try {
      await markSampleFormAsReceived(item.id, adminInfo.email);
      toast.success("Sample form marked as received.");
      await load();
    } catch { toast.error("Failed to update status."); }
    finally { setProcessingId(null); }
  };

  const handleReview = async (item: SampleFormRecord) => {
    if (!adminInfo?.email) { toast.error("Admin identity missing."); return; }
    setProcessingId(item.id);
    try {
      await markSampleFormAsReviewed(item.id, adminInfo.email);
      toast.success("Sample form marked as reviewed.");
      await load();
    } catch { toast.error("Failed to update status."); }
    finally { setProcessingId(null); }
  };

  const handleDownload = async (item: SampleFormRecord) => {
    setDownloadingId(item.id);
    try {
      const blob = await pdf(<SampleSubmissionFormPDF form={item} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${item.documentNumber || `PGCV-LF-SSF-${item.id.slice(0, 8)}`}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { toast.error("Failed to generate PDF."); }
    finally { setDownloadingId(null); }
  };

  const handleViewPdf = (item: SampleFormRecord) => {
    window.open(`/api/sample-forms/pdf?id=${item.id}`, "_blank");
  };

  return (
    <div className="container mx-auto py-4 space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Sample Forms Monitoring</h1>
        <p className="text-sm text-muted-foreground">
          Review incoming sample submission forms and mark them as received/reviewed.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              placeholder="Search by doc no., project, email, or status"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Submitted Forms ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SampleFormList
            records={filtered}
            loading={loading}
            processingId={processingId}
            downloadingId={downloadingId}
            onViewPdf={handleViewPdf}
            onDownload={handleDownload}
            onMarkReceived={handleReceive}
            onMarkReviewed={handleReview}
          />
        </CardContent>
      </Card>
    </div>
  );
}