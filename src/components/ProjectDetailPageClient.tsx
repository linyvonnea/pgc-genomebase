"use client";

import { useEffect, useMemo, useState } from "react";
import { notFound, useParams, useRouter } from "next/navigation";
import { collection, getDocs, orderBy, query, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getProjectById } from "@/services/clientProjectService";
import { Project } from "@/types/Project";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { logActivity } from "@/services/activityLogService";
import useAuth from "@/hooks/useAuth";

interface ReceiptRecord {
  id: string;
  fileName?: string;
  contentType?: string;
  size?: number;
  downloadURL?: string;
  uploadedBy?: string;
  uploadedAt?: Timestamp;
}

export default function ProjectDetailPageClient() {
  const { adminInfo } = useAuth();
  const { pid } = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [receiptsError, setReceiptsError] = useState("");

  useEffect(() => {
    if (!pid || typeof pid !== "string") return;

    const fetchProject = async () => {
      try {
        const data = await getProjectById(pid);
        setProject(data);

        await logActivity({
          userId: adminInfo?.email || "system",
          userEmail: adminInfo?.email || "system@pgc.admin",
          userName: adminInfo?.name || "System",
          action: "VIEW",
          entityType: "project",
          entityId: pid,
          entityName: data?.title || pid,
          description: `Viewed project: ${data?.title || pid}`,
        });
      } catch (error) {
        console.error("Error loading project:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [pid, adminInfo?.email, adminInfo?.name]);

  useEffect(() => {
    if (!pid || typeof pid !== "string") return;

    const fetchReceipts = async () => {
      setReceiptsLoading(true);
      setReceiptsError("");
      try {
        const receiptsRef = collection(db, "projects", pid, "officialReceipts");
        const receiptsQuery = query(receiptsRef, orderBy("uploadedAt", "desc"));
        const snapshot = await getDocs(receiptsQuery);
        const results = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as any) }));
        setReceipts(results);
      } catch (error) {
        console.error("Failed to load official receipts:", error);
        setReceiptsError("Unable to load official receipts.");
        setReceipts([]);
      } finally {
        setReceiptsLoading(false);
      }
    };

    fetchReceipts();
  }, [pid]);

  const statusBadgeClass = useMemo(() => {
    switch (project?.status) {
      case "Pending":
        return "bg-blue-50 text-blue-700 border-blue-100";
      case "Ongoing":
        return "bg-amber-50 text-amber-700 border-amber-100";
      case "Completed":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "Cancelled":
        return "bg-rose-50 text-rose-700 border-rose-100";
      default:
        return "bg-gray-50 text-gray-700 border-gray-100";
    }
  }, [project?.status]);

  const formatDate = (value?: string | Date) => {
    if (!value) return "—";
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString();
  };

  const formatTimestamp = (value?: Timestamp) => {
    if (!value) return "—";
    const date = typeof value.toDate === "function" ? value.toDate() : new Date(value as any);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleString();
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading project...</div>;
  if (!project) return notFound();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50/50 to-blue-50/30 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#166FB5] to-[#4038AF] bg-clip-text text-transparent">
                Project Details
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-slate-600">Project ID:</span>
                <Badge variant="outline" className="font-mono text-[#166FB5] border-[#166FB5]/30 bg-[#166FB5]/5">
                  {project.pid}
                </Badge>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusBadgeClass}`}>
                  {project.status || "—"}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push("/admin/projects")}
              className="hover:bg-slate-50 border-slate-200"
            >
              ← Back to List
            </Button>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-gradient-to-r from-[#F69122] to-[#B9273A] rounded-full"></div>
            Project Summary
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Project Title</span>
                <span className="text-sm font-medium text-slate-800">{project.title || "—"}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Lead</span>
                <span className="text-sm font-medium text-slate-800">{project.lead || "—"}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Personnel Assigned</span>
                <span className="text-sm font-medium text-slate-800">{project.personnelAssigned || "—"}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Inquiry ID(s)</span>
                <span className="text-sm font-medium text-slate-800">
                  {Array.isArray(project.iid) ? project.iid.join(", ") : project.iid || "—"}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Start Date</span>
                <span className="text-sm font-medium text-slate-800">{formatDate(project.startDate)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Created</span>
                <span className="text-sm font-medium text-slate-800">{formatDate(project.createdAt)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Sending Institution</span>
                <span className="text-sm font-medium text-slate-800">{project.sendingInstitution || "—"}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Funding Category</span>
                <span className="text-sm font-medium text-slate-800">{project.fundingCategory || "—"}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Services Requested</span>
              <div className="flex items-center gap-2 flex-wrap">
                {(project.serviceRequested || []).length > 0 ? (
                  project.serviceRequested?.map((service) => (
                    <Badge key={service} className="bg-[#166FB5]/10 text-[#166FB5] border-[#166FB5]/20">
                      {service}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">—</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-gradient-to-r from-[#16A34A] to-[#0F766E] rounded-full"></div>
            Documents
          </h2>
          <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50/60 p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-700">Official Receipts</div>
              <div className="text-[10px] text-slate-500">{receipts.length} total</div>
            </div>
            {receiptsLoading ? (
              <div className="text-xs text-slate-500">Loading receipts...</div>
            ) : receiptsError ? (
              <div className="text-xs text-rose-600">{receiptsError}</div>
            ) : receipts.length === 0 ? (
              <div className="text-xs text-slate-400">No official receipts uploaded yet.</div>
            ) : (
              <div className="space-y-2">
                {receipts.map((receipt) => (
                  <div key={receipt.id} className="flex items-start justify-between gap-3 rounded-md bg-white px-3 py-2 border border-slate-200">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-700 truncate">
                        {receipt.fileName || receipt.id}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {receipt.uploadedBy || "Unknown uploader"} • {formatTimestamp(receipt.uploadedAt)}
                      </div>
                    </div>
                    {receipt.downloadURL && (
                      <a
                        href={receipt.downloadURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-blue-600 hover:underline shrink-0"
                      >
                        View
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
