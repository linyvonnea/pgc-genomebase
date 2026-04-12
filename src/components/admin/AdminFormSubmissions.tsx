"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import useAuth from "@/hooks/useAuth";

interface SubmittedFile {
  id: string;
  formLabel: string;
  formKey: string;
  fileName: string;
  downloadURL: string;
  uploadedAt: Timestamp | null;
  uploadedBy: string;
  acknowledgedByAdmin: boolean;
  acknowledgedAt?: Timestamp | null;
  acknowledgedBy?: string;
}

interface AdminFormSubmissionsProps {
  projectId: string;
}

const FORM_KEY_ORDER = ["ssf", "ssreq"];

export default function AdminFormSubmissions({ projectId }: AdminFormSubmissionsProps) {
  const { adminInfo } = useAuth();
  const [submissions, setSubmissions] = useState<SubmittedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    // Use a simple query (no orderBy) to avoid composite index requirement.
    // Results are sorted client-side below.
    const q = query(
      collection(db, "clientFormSubmissions"),
      where("projectId", "==", projectId)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const items: SubmittedFile[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            formLabel: data.formLabel ?? data.formKey,
            formKey: data.formKey,
            fileName: data.fileName,
            downloadURL: data.downloadURL,
            uploadedAt: data.uploadedAt ?? null,
            uploadedBy: data.uploadedBy ?? "client",
            acknowledgedByAdmin: data.acknowledgedByAdmin ?? false,
            acknowledgedAt: data.acknowledgedAt ?? null,
            acknowledgedBy: data.acknowledgedBy ?? null,
          };
        });
        // Sort newest-first client-side
        items.sort((a, b) => {
          const aMs = a.uploadedAt?.toMillis() ?? 0;
          const bMs = b.uploadedAt?.toMillis() ?? 0;
          return bMs - aMs;
        });
        setSubmissions(items);
        setLoading(false);
      },
      (error) => {
        console.error("AdminFormSubmissions: Firestore error", error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [projectId]);

  const handleAcknowledge = async (submissionId: string, fileName: string) => {
    setAcknowledging(submissionId);
    try {
      await updateDoc(doc(db, "clientFormSubmissions", submissionId), {
        acknowledgedByAdmin: true,
        acknowledgedAt: serverTimestamp(),
        acknowledgedBy: adminInfo?.email ?? "admin",
      });
      toast.success(`"${fileName}" marked as acknowledged.`);
    } catch {
      toast.error("Failed to acknowledge. Please try again.");
    } finally {
      setAcknowledging(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400 py-2 ml-5">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading submissions…
      </div>
    );
  }

  if (submissions.length === 0) {
    return <p className="text-xs text-slate-400 ml-5">No uploaded forms yet</p>;
  }

  return (
    <div className="space-y-2 ml-5">
      {submissions.map((f) => {
        const isAcknowledging = acknowledging === f.id;
        return (
          <div
            key={f.id}
            className={`rounded-lg border p-3 space-y-1.5 ${
              f.acknowledgedByAdmin
                ? "border-emerald-100 bg-emerald-50/40"
                : "border-amber-100 bg-amber-50/30"
            }`}
          >
            {/* File header */}
            <div className="flex items-start gap-2">
              <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0 text-orange-500" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-700 truncate">{f.formLabel}</p>
                <p className="text-[10px] text-slate-500 truncate" title={f.fileName}>{f.fileName}</p>
              </div>
              {/* Status badge */}
              {f.acknowledgedByAdmin ? (
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5 shrink-0">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  Acknowledged
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5 shrink-0">
                  <Clock className="h-2.5 w-2.5" />
                  Pending review
                </span>
              )}
            </div>

            {/* Meta: upload date + by */}
            <div className="flex items-center gap-3 pl-5 text-[10px] text-slate-400">
              {f.uploadedAt && (
                <span>Uploaded {format(f.uploadedAt.toDate(), "MMM d, yyyy")}</span>
              )}
              {f.uploadedBy && (
                <span>by {f.uploadedBy}</span>
              )}
              {f.acknowledgedByAdmin && f.acknowledgedAt && (
                <span className="text-emerald-600">
                  Acknowledged {format(f.acknowledgedAt.toDate(), "MMM d, yyyy")}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pl-5">
              <a
                href={f.downloadURL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
              >
                <Eye className="h-3 w-3" />
                View PDF
              </a>
              {!f.acknowledgedByAdmin && (
                <button
                  onClick={() => handleAcknowledge(f.id, f.fileName)}
                  disabled={isAcknowledging}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAcknowledging ? (
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-2.5 w-2.5" />
                  )}
                  {isAcknowledging ? "Saving…" : "Acknowledge"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
