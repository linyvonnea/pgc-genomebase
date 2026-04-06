"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Inquiry } from "@/types/Inquiry";
import { QuotationRecord } from "@/types/Quotation";
import { getQuotationsByInquiryId } from "@/services/quotationService";
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
  CalendarDays,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  User,
  Building2,
  Briefcase,
  FlaskConical,
  X,
  ClipboardList,
} from "lucide-react";
import { logActivity } from "@/services/activityLogService";
import useAuth from "@/hooks/useAuth";
import { EditInquiryModal } from "@/components/forms/EditInquiryModal";

interface InquiryDetailSheetProps {
  inquiry: Inquiry | null;
  open: boolean;
  onClose: () => void;
  onInquiryUpdated?: () => void;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <span className="text-sm font-medium text-slate-800">
        {value ?? <span className="text-slate-400 italic">—</span>}
      </span>
    </div>
  );
}

function SectionHeader({
  icon,
  label,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
}) {
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
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  "Ongoing Quotation": "bg-orange-50 text-orange-700 border-orange-200",
  "Quotation Only": "bg-blue-50 text-blue-700 border-blue-200",
  "Approved Client": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "In Progress": "bg-sky-50 text-sky-700 border-sky-200",
  "Service Not Offered": "bg-slate-50 text-slate-500 border-slate-200",
  Cancelled: "bg-rose-50 text-rose-700 border-rose-200",
};

const quotationStatusColor: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  "in-progress": "bg-sky-50 text-sky-700 border-sky-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
};

function formatDate(value?: Date | string | null) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
}

function capitalize(str?: string | null) {
  if (!str) return "—";
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, " ");
}

export function InquiryDetailSheet({
  inquiry,
  open,
  onClose,
  onInquiryUpdated,
}: InquiryDetailSheetProps) {
  const { adminInfo } = useAuth();
  const router = useRouter();

  const [quotations, setQuotations] = useState<QuotationRecord[]>([]);
  const [loadingQuotations, setLoadingQuotations] = useState(false);

  useEffect(() => {
    if (!open || !inquiry?.id) return;

    const loadData = async () => {
      setLoadingQuotations(true);
      setQuotations([]);

      try {
        const qs = await getQuotationsByInquiryId(inquiry.id).catch(() => []);
        setQuotations(qs as QuotationRecord[]);

        await logActivity({
          userId: adminInfo?.email || "system",
          userEmail: adminInfo?.email || "system@pgc.admin",
          userName: adminInfo?.name || "System",
          action: "VIEW",
          entityType: "inquiry",
          entityId: inquiry.id,
          entityName: inquiry.name || inquiry.id,
          description: `Viewed inquiry details: ${inquiry.name || inquiry.id}`,
        });
      } catch (err) {
        console.error("Failed to load inquiry data:", err);
      } finally {
        setLoadingQuotations(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, inquiry?.id]);

  if (!inquiry) return null;

  const status = inquiry.status ?? "Pending";

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
                Inquiry Details
              </SheetTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className="font-mono text-[#F69122] border-[#F69122]/30 bg-[#F69122]/5 text-xs"
                >
                  {inquiry.id}
                </Badge>
                <Badge
                  className={`text-xs border ${statusColor[status] ?? "bg-gray-50 text-gray-700 border-gray-200"}`}
                  variant="outline"
                >
                  {status}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <EditInquiryModal
                inquiry={inquiry}
                onSuccess={() => {
                  onClose();
                  onInquiryUpdated?.();
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>
        </div>

        <div className="px-6 py-5 space-y-6">

          {/* ── Applicant Info ── */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <SectionHeader
              icon={<User className="h-4 w-4 text-[#166FB5]" />}
              label="Applicant Information"
            />
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="Full Name" value={inquiry.name} />
              <InfoRow label="Designation" value={inquiry.designation} />
              <InfoRow
                label="Email"
                value={
                  inquiry.email ? (
                    <a
                      href={`mailto:${inquiry.email}`}
                      className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                    >
                      <Mail className="h-3 w-3" />
                      {inquiry.email}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
              <InfoRow label="Submitted On" value={formatDate(inquiry.createdAt)} />
            </div>
            <InfoRow label="Affiliation" value={inquiry.affiliation} />
          </section>

          {/* ── Status & Service ── */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <SectionHeader
              icon={<Briefcase className="h-4 w-4 text-indigo-600" />}
              label="Status & Service"
            />
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <InfoRow
                label="Status"
                value={
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusColor[status] ?? ""}`}
                  >
                    {status}
                  </span>
                }
              />
              <InfoRow
                label="Service Type"
                value={capitalize(inquiry.serviceType)}
              />
              {inquiry.species && (
                <InfoRow label="Species" value={capitalize(inquiry.species)} />
              )}
              {inquiry.workflowType && (
                <InfoRow
                  label="Workflow Type"
                  value={capitalize(inquiry.workflowType)}
                />
              )}
              {inquiry.sampleCount != null && (
                <InfoRow
                  label="Sample Count"
                  value={inquiry.sampleCount.toString()}
                />
              )}
              {inquiry.plannedSampleCount && (
                <InfoRow
                  label="Planned Sample Count"
                  value={inquiry.plannedSampleCount}
                />
              )}
            </div>
            {inquiry.researchOverview && (
              <InfoRow
                label="Research Overview"
                value={
                  <span className="text-sm text-slate-600 whitespace-pre-wrap">
                    {inquiry.researchOverview}
                  </span>
                }
              />
            )}
            {inquiry.additionalInfo && (
              <InfoRow
                label="Additional Info"
                value={
                  <span className="text-sm text-slate-600 whitespace-pre-wrap">
                    {inquiry.additionalInfo}
                  </span>
                }
              />
            )}
          </section>

          {/* ── Bioinformatics Options ── */}
          {(inquiry.bioinfoOptions?.length ?? 0) > 0 && (
            <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
              <SectionHeader
                icon={<FlaskConical className="h-4 w-4 text-purple-600" />}
                label="Bioinformatics Options"
                count={inquiry.bioinfoOptions!.length}
              />
              <Separator />
              <div className="flex flex-wrap gap-2">
                {inquiry.bioinfoOptions!.map((opt) => (
                  <Badge
                    key={opt}
                    variant="outline"
                    className="text-purple-700 border-purple-200 bg-purple-50 text-xs"
                  >
                    {capitalize(opt)}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {/* ── Retail Items ── */}
          {(inquiry.retailItems?.length ?? 0) > 0 && (
            <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
              <SectionHeader
                icon={<ClipboardList className="h-4 w-4 text-orange-600" />}
                label="Retail Items"
                count={inquiry.retailItems!.length}
              />
              <Separator />
              <div className="flex flex-wrap gap-2">
                {inquiry.retailItems!.map((item) => (
                  <Badge
                    key={item}
                    variant="outline"
                    className="text-orange-700 border-orange-200 bg-orange-50 text-xs"
                  >
                    {item}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {/* ── Training ── */}
          {inquiry.serviceType === "training" && (
            <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
              <SectionHeader
                icon={<Building2 className="h-4 w-4 text-emerald-600" />}
                label="Training Details"
              />
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                {inquiry.specificTrainingNeed && (
                  <InfoRow
                    label="Specific Need"
                    value={inquiry.specificTrainingNeed}
                  />
                )}
                {inquiry.targetTrainingDate && (
                  <InfoRow
                    label="Target Date"
                    value={inquiry.targetTrainingDate}
                  />
                )}
                {inquiry.numberOfParticipants != null && (
                  <InfoRow
                    label="No. of Participants"
                    value={inquiry.numberOfParticipants.toString()}
                  />
                )}
              </div>
              {(inquiry.trainingPrograms?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-2">
                  {inquiry.trainingPrograms!.map((p) => (
                    <Badge
                      key={p}
                      variant="outline"
                      className="text-emerald-700 border-emerald-200 bg-emerald-50 text-xs"
                    >
                      {p}
                    </Badge>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── Quotations ── */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2 py-2">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#166FB5] to-[#4038AF]" />
              <div className="flex items-center gap-1.5 text-slate-700">
                <FileText className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-semibold">Quotations</span>
              </div>
              {loadingQuotations ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400 ml-1" />
              ) : (
                <span className="text-[10px] text-slate-500">
                  ({quotations.length})
                </span>
              )}
            </div>
            <Separator />

            {loadingQuotations ? (
              <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading quotations…
              </div>
            ) : quotations.length === 0 ? (
              <p className="text-xs text-slate-400">No quotations found for this inquiry.</p>
            ) : (
              <div className="space-y-2">
                {quotations.map((q) => (
                  <div
                    key={q.id ?? q.referenceNumber}
                    className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 hover:bg-purple-50/40 hover:border-purple-200 transition-colors cursor-pointer group"
                    onClick={() =>
                      router.push(`/admin/quotations/${q.referenceNumber}`)
                    }
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-mono font-semibold text-slate-700">
                          {q.referenceNumber}
                        </span>
                        {q.status && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] border ${quotationStatusColor[q.status] ?? ""}`}
                          >
                            {capitalize(q.status)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Issued: {q.dateIssued ?? "—"} · Total: ₱
                        {q.total?.toLocaleString() ?? "—"}
                      </p>
                    </div>
                    <a
                      href={`/admin/quotations/${q.referenceNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ))}
              </div>
            )}

            {/* Quick link to create a new quotation */}
            <div className="pt-1">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs border-dashed border-purple-300 text-purple-700 hover:bg-purple-50"
                onClick={() =>
                  router.push(`/admin/quotations/new?inquiryId=${inquiry.id}`)
                }
              >
                + New Quotation for this Inquiry
              </Button>
            </div>
          </section>

          {/* ── Metadata ── */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <SectionHeader
              icon={<CalendarDays className="h-4 w-4 text-slate-500" />}
              label="Metadata"
            />
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <InfoRow
                label="Inquiry ID"
                value={
                  <span className="font-mono text-xs">{inquiry.id}</span>
                }
              />
              <InfoRow
                label="Submitted On"
                value={formatDate(inquiry.createdAt)}
              />
              <InfoRow
                label="Has Logged In"
                value={inquiry.hasLoggedIn ? "Yes" : "No"}
              />
              <InfoRow
                label="Opened Quotation"
                value={inquiry.hasOpenedQuotation ? "Yes" : "No"}
              />
            </div>
            {inquiry.cancellationReason && (
              <InfoRow
                label="Cancellation Reason"
                value={
                  <span className="text-sm text-rose-600 whitespace-pre-wrap">
                    {inquiry.cancellationReason}
                  </span>
                }
              />
            )}
          </section>

        </div>
      </SheetContent>
    </Sheet>
  );
}
