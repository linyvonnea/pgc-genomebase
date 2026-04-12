"use client";

import { useEffect, useState } from "react";
import { Project } from "@/types/Project";

import { getChargeSlipsByProjectId } from "@/services/chargeSlipService";
import { getSampleFormsByProjectId } from "@/services/sampleFormService";
import { getQuotationsByInquiryId } from "@/services/quotationService";
import { ChargeSlipRecord } from "@/types/ChargeSlipRecord";
import { SampleFormSummary } from "@/types/SampleForm";
import { QuotationRecord } from "@/types/Quotation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Briefcase,
  Building2,
  CalendarDays,
  ExternalLink,
  FileText,
  Loader2,
  Receipt,
  User,
  Users,
  X,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Eye,
  Upload,
} from "lucide-react";
import { logActivity } from "@/services/activityLogService";
import useAuth from "@/hooks/useAuth";
import { EditProjectModal } from "@/components/forms/EditProjectModal";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from "date-fns";
import { toast } from "sonner";

interface ProjectDetailSheetProps {
  project: Project | null;
  open: boolean;
  onClose: () => void;
  onProjectUpdated?: () => void;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value ?? <span className="text-slate-400 italic">—</span>}</span>
    </div>
  );
}

function SectionHeader({ icon, label, count }: { icon: React.ReactNode; label: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 py-2">
      <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#166FB5] to-[#4038AF]" />
      <div className="flex items-center gap-1.5 text-slate-700">
        {icon}
        <span className="text-sm font-semibold">{label}</span>
      </div>
      {count !== undefined && (
        <span className="text-[10px] text-slate-500">({count})</span>
      )}
    </div>
  );
}

const statusColor: Record<string, string> = {
  Pending: "bg-blue-50 text-blue-700 border-blue-200",
  Ongoing: "bg-amber-50 text-amber-700 border-amber-200",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Cancelled: "bg-rose-50 text-rose-700 border-rose-200",
};

function formatDate(value?: Date | string) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function formatFileSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ClientFormSubmission {
  id: string;
  formKey: string;
  formLabel: string;
  fileName: string;
  downloadURL: string;
  storagePath: string;
  uploadedAt: Timestamp | null;
  uploadedBy: string;
  acknowledgedByAdmin: boolean;
  acknowledgedAt?: Timestamp;
  acknowledgedBy?: string;
}

export function ProjectDetailSheet({ project, open, onClose, onProjectUpdated }: ProjectDetailSheetProps) {
  const { adminInfo } = useAuth();

  const [quotations, setQuotations] = useState<QuotationRecord[]>([]);
  const [chargeSlips, setChargeSlips] = useState<ChargeSlipRecord[]>([]);
  const [sampleForms, setSampleForms] = useState<SampleFormSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [clientSubmissions, setClientSubmissions] = useState<ClientFormSubmission[]>([]);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !project?.pid) return;

    const loadDocs = async () => {
      setLoading(true);
      setQuotations([]);
      setChargeSlips([]);
      setSampleForms([]);

      try {
        const pid = project.pid!;
        const iid = project.iid;

        const [qs, cs, sf] = await Promise.all([
          iid ? getQuotationsByInquiryId(iid).catch(() => []) : Promise.resolve([]),
          getChargeSlipsByProjectId(pid).catch(() => []),
          getSampleFormsByProjectId(pid).catch(() => []),
        ]);

        setQuotations(qs as QuotationRecord[]);
        setChargeSlips(cs as ChargeSlipRecord[]);
        setSampleForms(sf as SampleFormSummary[]);

        // Log view
        await logActivity({
          userId: adminInfo?.email || "system",
          userEmail: adminInfo?.email || "system@pgc.admin",
          userName: adminInfo?.name || "System",
          action: "VIEW",
          entityType: "project",
          entityId: pid,
          entityName: project.title || pid,
          description: `Viewed project details: ${project.title || pid}`,
        });
      } catch (err) {
        console.error("Failed to load project documents:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDocs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, project?.pid]);

  // Realtime listener for client form submissions
  useEffect(() => {
    if (!open || !project?.pid) {
      setClientSubmissions([]);
      return;
    }
    const q = query(
      collection(db, "clientFormSubmissions"),
      where("projectId", "==", project.pid),
      orderBy("uploadedAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const docs: ClientFormSubmission[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          formKey: data.formKey,
          formLabel: data.formLabel,
          fileName: data.fileName,
          downloadURL: data.downloadURL,
          storagePath: data.storagePath,
          uploadedAt: data.uploadedAt ?? null,
          uploadedBy: data.uploadedBy ?? "",
          acknowledgedByAdmin: data.acknowledgedByAdmin ?? false,
          acknowledgedAt: data.acknowledgedAt,
          acknowledgedBy: data.acknowledgedBy,
        };
      });
      setClientSubmissions(docs);
    });
    return () => unsub();
  }, [open, project?.pid]);

  const handleAcknowledge = async (submissionId: string) => {
    if (!adminInfo?.email) return;
    try {
      setAcknowledgingId(submissionId);
      await updateDoc(doc(db, "clientFormSubmissions", submissionId), {
        acknowledgedByAdmin: true,
        acknowledgedAt: serverTimestamp(),
        acknowledgedBy: adminInfo.email,
      });
      toast.success("Form submission acknowledged.");
    } catch (err) {
      console.error("Acknowledge failed:", err);
      toast.error("Could not acknowledge. Please try again.");
    } finally {
      setAcknowledgingId(null);
    }
  };

  if (!project) return null;

  const iids = Array.isArray(project.iid) ? project.iid : project.iid ? [project.iid] : [];
  const status = project.status ?? "Pending";

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl overflow-y-auto p-0 border-l shadow-2xl"
      >
        {/* ── Header ── */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-4">
          <SheetHeader className="flex-row items-start justify-between space-y-0">
            <div className="space-y-1">
              <SheetTitle className="text-xl font-bold bg-gradient-to-r from-[#166FB5] to-[#4038AF] bg-clip-text text-transparent">
                Project Details
              </SheetTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="font-mono text-[#F69122] border-[#F69122]/30 bg-[#F69122]/5 text-xs">
                  {project.pid}
                </Badge>
                <Badge className={`text-xs border ${statusColor[status] ?? "bg-gray-50 text-gray-700 border-gray-200"}`} variant="outline">
                  {status}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <EditProjectModal
                project={project}
                onSuccess={() => {
                  onClose();
                  onProjectUpdated?.();
                }}
              />
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>
        </div>

        <div className="px-6 py-5 space-y-6">

          {/* ── Project Overview ── */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <SectionHeader icon={<Briefcase className="h-4 w-4 text-[#166FB5]" />} label="Project Overview" />
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="Year" value={project.year?.toString()} />
              <InfoRow label="Start Date" value={formatDate(project.startDate)} />
              <InfoRow label="Project Tag" value={project.projectTag} />
              <InfoRow label="Status" value={
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusColor[status] ?? ""}`}>
                  {status}
                </span>
              } />
            </div>
            <InfoRow label="Project Title" value={<span className="text-sm">{project.title}</span>} />
            {project.notes && (
              <InfoRow label="Notes" value={<span className="text-sm text-slate-600">{project.notes}</span>} />
            )}
          </section>

          {/* ── Inquiry IDs ── */}
          {iids.length > 0 && (
            <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
              <SectionHeader icon={<FileText className="h-4 w-4 text-purple-600" />} label="Inquiry IDs" count={iids.length} />
              <Separator />
              <div className="flex flex-wrap gap-2">
                {iids.map((id) => (
                  <Badge key={id} variant="outline" className="font-mono text-purple-700 border-purple-200 bg-purple-50 text-xs">
                    {id}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {/* ── People ── */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <SectionHeader icon={<Users className="h-4 w-4 text-indigo-600" />} label="People" />
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="Project Lead" value={project.lead} />
              <InfoRow label="Personnel Assigned" value={project.personnelAssigned} />
            </div>
            {(project.clientNames?.length ?? 0) > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Clients / Members</span>
                <div className="flex flex-wrap gap-1.5">
                  {project.clientNames!.map((name, i) => (
                    <div key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-medium text-indigo-700">
                      <User className="h-3 w-3" />
                      {name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ── Institution & Funding ── */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <SectionHeader icon={<Building2 className="h-4 w-4 text-emerald-600" />} label="Institution & Funding" />
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="Sending Institution" value={project.sendingInstitution} />
              <InfoRow label="Funding Category" value={project.fundingCategory} />
              <InfoRow label="Funding Institution" value={project.fundingInstitution} />
              <InfoRow label="Created At" value={formatDate(project.createdAt)} />
            </div>
          </section>

          {/* ── Services Requested ── */}
          {(project.serviceRequested?.length ?? 0) > 0 && (
            <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
              <SectionHeader icon={<Briefcase className="h-4 w-4 text-orange-600" />} label="Services Requested" count={project.serviceRequested!.length} />
              <Separator />
              <div className="flex flex-wrap gap-2">
                {project.serviceRequested!.map((s) => (
                  <Badge key={s} variant="outline" className="text-orange-700 border-orange-200 bg-orange-50 text-xs">
                    {s}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {/* ── Documents ── */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-5">
            <div className="flex items-center gap-2 py-2">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#166FB5] to-[#4038AF]" />
              <FileText className="h-4 w-4 text-slate-700" />
              <span className="text-sm font-semibold text-slate-700">Documents</span>
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400 ml-1" />}
            </div>
            <Separator />

            {loading ? (
              <div className="flex items-center gap-2 text-xs text-slate-500 py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading documents…
              </div>
            ) : (
              <div className="space-y-5">

                {/* Quotations */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <FileText className="h-3.5 w-3.5 text-purple-600" />
                    <span className="text-xs font-semibold text-slate-700">Quotations</span>
                    <span className="text-[10px] text-slate-500">({quotations.length})</span>
                  </div>
                  {quotations.length === 0 ? (
                    <p className="text-xs text-slate-400 ml-5">No quotations</p>
                  ) : (
                    <div className="space-y-1 ml-5">
                      {quotations.map((q) => (
                        <div key={q.id} className="flex items-center justify-between gap-2 py-1 border-b border-slate-50 last:border-0">
                          <span className="text-xs font-mono text-slate-600">{q.referenceNumber}</span>
                          <a
                            href={`/admin/quotations/${q.referenceNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                          >
                            View <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Charge Slips */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Receipt className="h-3.5 w-3.5 text-green-600" />
                    <span className="text-xs font-semibold text-slate-700">Charge Slips</span>
                    <span className="text-[10px] text-slate-500">({chargeSlips.length})</span>
                  </div>
                  {chargeSlips.length === 0 ? (
                    <p className="text-xs text-slate-400 ml-5">No charge slips</p>
                  ) : (
                    <div className="space-y-1 ml-5">
                      {chargeSlips.map((cs) => (
                        <div key={cs.id} className="flex items-center justify-between gap-2 py-1 border-b border-slate-50 last:border-0">
                          <span className="text-xs font-mono text-slate-600">{cs.chargeSlipNumber}</span>
                          <a
                            href={`/client/view-document?type=charge-slip&ref=${cs.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                          >
                            View <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sample Forms */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <FileSpreadsheet className="h-3.5 w-3.5 text-orange-600" />
                    <span className="text-xs font-semibold text-slate-700">Sample Forms</span>
                    <span className="text-[10px] text-slate-500">({sampleForms.length})</span>
                  </div>
                  {sampleForms.length === 0 ? (
                    <p className="text-xs text-slate-400 ml-5">No sample forms</p>
                  ) : (
                    <div className="space-y-1 ml-5">
                      {sampleForms.map((sf) => (
                        <div key={sf.id} className="flex items-center justify-between gap-2 py-1 border-b border-slate-50 last:border-0">
                          <div>
                            <span className="text-xs font-mono text-slate-600">{sf.id}</span>
                            <span className="text-[10px] text-slate-400 ml-2">({sf.totalNumberOfSamples} samples)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Client Form Submissions */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Upload className="h-3.5 w-3.5 text-sky-600" />
                    <span className="text-xs font-semibold text-slate-700">Client Form Submissions</span>
                    <span className="text-[10px] text-slate-500">({clientSubmissions.length})</span>
                    {clientSubmissions.some((s) => !s.acknowledgedByAdmin) && (
                      <span className="ml-1 text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5">
                        {clientSubmissions.filter((s) => !s.acknowledgedByAdmin).length} pending
                      </span>
                    )}
                  </div>
                  {clientSubmissions.length === 0 ? (
                    <p className="text-xs text-slate-400 ml-5">No submissions yet</p>
                  ) : (
                    <div className="space-y-2 ml-0">
                      {clientSubmissions.map((sub) => (
                        <div
                          key={sub.id}
                          className={`rounded-lg border px-3 py-2 flex items-start gap-3 ${
                            sub.acknowledgedByAdmin
                              ? "border-emerald-100 bg-emerald-50/50"
                              : "border-amber-100 bg-amber-50/50"
                          }`}
                        >
                          <div className="mt-0.5">
                            {sub.acknowledgedByAdmin ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                            ) : (
                              <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-700 truncate" title={sub.fileName}>
                              {sub.fileName}
                            </p>
                            <p className="text-[10px] text-slate-500">{sub.formLabel}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {sub.uploadedAt && (
                                <span className="text-[10px] text-slate-400">
                                  Uploaded {format(sub.uploadedAt.toDate(), "MMM d, yyyy 'at' h:mm a")}
                                </span>
                              )}
                              {sub.acknowledgedByAdmin && sub.acknowledgedAt && (
                                <span className="text-[10px] text-emerald-600">
                                  · Acknowledged {format(sub.acknowledgedAt.toDate(), "MMM d")}
                                  {sub.acknowledgedBy ? ` by ${sub.acknowledgedBy}` : ""}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <a
                              href={sub.downloadURL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-[#166FB5] hover:underline"
                              title="View PDF"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </a>
                            {!sub.acknowledgedByAdmin && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px] px-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                onClick={() => handleAcknowledge(sub.id)}
                                disabled={acknowledgingId === sub.id}
                              >
                                {acknowledgingId === sub.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                )}
                                Acknowledge
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>


              </div>
            )}
          </section>

          {/* ── Metadata ── */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <SectionHeader icon={<CalendarDays className="h-4 w-4 text-slate-500" />} label="Metadata" />
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="Project ID (PID)" value={<span className="font-mono text-xs">{project.pid}</span>} />
              <InfoRow label="Record Created" value={formatDate(project.createdAt)} />
            </div>
          </section>

        </div>
      </SheetContent>
    </Sheet>
  );
}
