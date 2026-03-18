"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SampleFormRecord } from "@/types/SampleForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import useAuth from "@/hooks/useAuth";
import { markSampleFormAsReceived, markSampleFormAsReviewed } from "@/services/sampleFormService";
import { CheckCircle2, Eye, FileText, Loader2, Search } from "lucide-react";
import { PermissionGuard } from "@/components/PermissionGuard";

function toDateLabel(value: any): string {
  if (!value) return "-";
  const date = value?.toDate?.() || new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(status: SampleFormRecord["status"]) {
  if (status === "reviewed") {
    return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Reviewed</Badge>;
  }
  if (status === "received") {
    return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Received</Badge>;
  }
  return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Submitted</Badge>;
}

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

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;

    return records.filter((item) => {
      return [
        item.documentNumber,
        item.submittedByEmail,
        item.submittedByName,
        item.projectId,
        item.projectTitle,
        item.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [records, search]);

  const handleReceive = async (formId: string) => {
    if (!adminInfo?.email) {
      toast.error("Admin identity missing.");
      return;
    }

    setProcessingId(formId);
    try {
      await markSampleFormAsReceived(formId, adminInfo.email);
      toast.success("Sample form marked as received.");
      await load();
    } catch (error) {
      console.error("Error marking received:", error);
      toast.error("Failed to update status.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReview = async (formId: string) => {
    if (!adminInfo?.email) {
      toast.error("Admin identity missing.");
      return;
    }

    setProcessingId(formId);
    try {
      await markSampleFormAsReviewed(formId, adminInfo.email);
      toast.success("Sample form marked as reviewed.");
      await load();
    } catch (error) {
      console.error("Error marking reviewed:", error);
      toast.error("Failed to update status.");
    } finally {
      setProcessingId(null);
    }
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
          <CardTitle className="text-base">Submitted Forms ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              Loading sample forms...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-slate-500">No sample forms found.</div>
          ) : (
            <div className="space-y-3">
              {filtered.map((item) => {
                const busy = processingId === item.id;
                return (
                  <div key={item.id} className="border rounded-lg p-3 bg-white">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <FileText className="h-4 w-4 text-[#166FB5]" />
                          <span className="font-semibold text-sm text-slate-800">
                            {item.documentNumber || `PGCV-LF-SSF-${item.id.slice(0, 8)}`}
                          </span>
                          {statusBadge(item.status)}
                        </div>
                        <p className="text-xs text-slate-500">
                          Project: {item.projectTitle || "Untitled Project"} ({item.projectId})
                        </p>
                        <p className="text-xs text-slate-500">
                          Submitted by: {item.submittedByName || item.submittedByEmail}
                        </p>
                        <p className="text-xs text-slate-500">
                          Created: {toDateLabel(item.createdAt)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <a
                          href={`/api/sample-forms/pdf?id=${item.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View PDF
                          </Button>
                        </a>

                        {item.status === "submitted" && (
                          <Button
                            size="sm"
                            onClick={() => handleReceive(item.id)}
                            disabled={busy}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Mark Received
                          </Button>
                        )}

                        {item.status !== "reviewed" && (
                          <Button
                            size="sm"
                            onClick={() => handleReview(item.id)}
                            disabled={busy}
                            variant="secondary"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Mark Reviewed
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
