"use client";

// Admin Member Approvals Page
// Allows admins to review, approve, or reject team member submissions from clients.

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getAllMemberApprovals,
  approveMemberApproval,
  rejectMemberApproval,
} from "@/services/memberApprovalService";
import { MemberApproval, ApprovalStatus } from "@/types/MemberApproval";
import useAuth from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  ShieldCheck,
  AlertCircle,
  Loader2,
  FolderOpen,
  User,
  Mail,
  Building2,
  Phone,
  Briefcase,
  MapPin,
  Filter,
} from "lucide-react";

type FilterStatus = "all" | ApprovalStatus;

export default function MemberApprovalsPage() {
  const { user, adminInfo } = useAuth();
  const [approvals, setApprovals] = useState<MemberApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("pending");
  const [selectedApproval, setSelectedApproval] = useState<MemberApproval | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllMemberApprovals(
        filterStatus === "all" ? undefined : filterStatus
      );
      // Sort by submittedAt descending
      data.sort((a, b) => {
        const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return bTime - aTime;
      });
      setApprovals(data);
    } catch (error) {
      console.error("Failed to fetch approvals:", error);
      toast.error("Failed to load approval requests");
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const handleApprove = async () => {
    if (!selectedApproval?.id) return;
    setProcessing(true);
    try {
      const generatedCids = await approveMemberApproval(
        selectedApproval.id,
        user?.email || "",
        adminInfo?.name || user?.displayName || "",
        reviewNotes
      );
      toast.success(
        `Approved! ${generatedCids.length} client ID(s) generated: ${generatedCids.join(", ")}`
      );
      setShowReviewDialog(false);
      setSelectedApproval(null);
      setReviewNotes("");
      fetchApprovals();
    } catch (error) {
      console.error("Approve error:", error);
      toast.error(`Failed to approve: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApproval?.id) return;
    if (!reviewNotes.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    setProcessing(true);
    try {
      await rejectMemberApproval(
        selectedApproval.id,
        user?.email || "",
        adminInfo?.name || user?.displayName || "",
        reviewNotes
      );
      toast.success("Submission rejected. The client will be notified.");
      setShowReviewDialog(false);
      setSelectedApproval(null);
      setReviewNotes("");
      fetchApprovals();
    } catch (error) {
      console.error("Reject error:", error);
      toast.error("Failed to reject submission");
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: ApprovalStatus) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-orange-100 text-orange-700 border-orange-200 border">
            <Clock className="h-3 w-3 mr-1" /> Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200 border">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200 border">
            <XCircle className="h-3 w-3 mr-1" /> Rejected
          </Badge>
        );
      case "draft":
        return (
          <Badge className="bg-gray-100 text-gray-700 border-gray-200 border">
            <AlertCircle className="h-3 w-3 mr-1" /> Draft
          </Badge>
        );
    }
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "—";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-[#166FB5] to-[#4038AF] rounded-lg">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            Member Approvals
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review and approve team member registrations submitted from the client portal
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(["pending", "approved", "rejected", "draft", "all"] as FilterStatus[]).map(
          (status) => (
            <Button
              key={status}
              variant={filterStatus === status ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus(status)}
              className={
                filterStatus === status
                  ? "bg-[#166FB5] text-white"
                  : "text-slate-600"
              }
            >
              {status === "pending" && <Clock className="h-3.5 w-3.5 mr-1.5" />}
              {status === "approved" && <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />}
              {status === "rejected" && <XCircle className="h-3.5 w-3.5 mr-1.5" />}
              {status === "draft" && <AlertCircle className="h-3.5 w-3.5 mr-1.5" />}
              {status === "all" && <Filter className="h-3.5 w-3.5 mr-1.5" />}
              <span className="capitalize">{status}</span>
            </Button>
          )
        )}
      </div>

      {/* Approval Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#166FB5]" />
          <span className="ml-3 text-slate-600">Loading approvals...</span>
        </div>
      ) : approvals.length === 0 ? (
        <Card className="border-2 border-dashed border-slate-300">
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 bg-slate-100 rounded-full">
                <ShieldCheck className="h-12 w-12 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700">
                No {filterStatus !== "all" ? filterStatus : ""} approval requests
              </h3>
              <p className="text-slate-500 max-w-md">
                {filterStatus === "pending"
                  ? "There are no pending member approvals at this time."
                  : "No approval requests match the current filter."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {approvals.map((approval) => (
            <Card
              key={approval.id}
              className="hover:shadow-md transition-shadow border border-slate-200"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-lg font-bold text-slate-800">
                        {approval.projectTitle}
                      </CardTitle>
                      {getStatusBadge(approval.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1 font-mono text-xs">
                        <FolderOpen className="h-3.5 w-3.5" />
                        {approval.projectPid}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        Submitted by: {approval.submittedByName || approval.submittedBy}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDate(approval.submittedAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedApproval(approval);
                        setReviewNotes("");
                        setShowReviewDialog(true);
                      }}
                      className="text-[#166FB5] border-[#166FB5] hover:bg-[#166FB5] hover:text-white"
                    >
                      <Eye className="h-4 w-4 mr-1.5" />
                      Review
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Users className="h-4 w-4 text-slate-400" />
                  <span className="font-medium">
                    {approval.members.filter((m) => !m.isPrimary).length} member(s)
                  </span>
                  <span className="text-slate-400">•</span>
                  <span>
                    {approval.members
                      .filter((m) => !m.isPrimary)
                      .map((m) => m.formData.name || "Unnamed")
                      .join(", ")}
                  </span>
                </div>
                {approval.reviewedBy && (
                  <div className="mt-2 text-xs text-slate-500">
                    Reviewed by {approval.reviewedByName || approval.reviewedBy} on{" "}
                    {formatDate(approval.reviewedAt)}
                    {approval.reviewNotes && (
                      <span className="block mt-1 italic text-slate-400">
                        &ldquo;{approval.reviewNotes}&rdquo;
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <ShieldCheck className="h-6 w-6 text-[#166FB5]" />
              Review Member Submission
            </DialogTitle>
            <DialogDescription>
              Review the team members submitted for{" "}
              <span className="font-semibold text-slate-700">
                {selectedApproval?.projectTitle}
              </span>{" "}
              (
              <span className="font-mono text-xs">
                {selectedApproval?.projectPid}
              </span>
              )
            </DialogDescription>
          </DialogHeader>

          {selectedApproval && (
            <div className="space-y-4 py-4">
              {/* Submission Info */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-500">Submitted by:</span>{" "}
                    <span className="font-medium text-slate-800">
                      {selectedApproval.submittedByName || selectedApproval.submittedBy}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Email:</span>{" "}
                    <span className="font-medium text-slate-800">
                      {selectedApproval.submittedBy}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Inquiry ID:</span>{" "}
                    <span className="font-mono text-xs text-slate-800">
                      {selectedApproval.inquiryId}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Status:</span>{" "}
                    {getStatusBadge(selectedApproval.status)}
                  </div>
                </div>
              </div>

              {/* Member Cards */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team Members ({selectedApproval.members.filter((m) => !m.isPrimary).length})
                </h3>
                {selectedApproval.members
                  .filter((m) => !m.isPrimary)
                  .map((member, idx) => (
                    <Card key={member.tempId || idx} className="border border-slate-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                            <User className="h-4 w-4 text-[#166FB5]" />
                            {member.formData.name || "Unnamed"}
                          </h4>
                          <Badge
                            className={
                              member.isValidated
                                ? "bg-blue-100 text-blue-700 border-blue-200 border"
                                : "bg-yellow-100 text-yellow-700 border-yellow-200 border"
                            }
                          >
                            {member.isValidated ? "Validated" : "Draft"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-slate-700">
                              {member.formData.email || "—"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-slate-700">
                              {member.formData.phoneNumber || "—"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-slate-700">
                              {member.formData.affiliation || "—"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-slate-700">
                              {member.formData.designation || "—"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 col-span-2">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-slate-700">
                              {member.formData.affiliationAddress || "—"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-slate-700">
                              Sex: {member.formData.sex || "—"}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>

              {/* Review Notes */}
              {selectedApproval.status === "pending" && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">
                    Review Notes <span className="text-slate-400 font-normal">(required for rejection)</span>
                  </Label>
                  <Textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add notes about your review decision..."
                    className="min-h-[80px]"
                  />
                </div>
              )}

              {/* Previous Review Info */}
              {selectedApproval.reviewedBy && (
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-sm">
                  <span className="text-slate-500">
                    Previously reviewed by{" "}
                    <span className="font-medium text-slate-700">
                      {selectedApproval.reviewedByName || selectedApproval.reviewedBy}
                    </span>{" "}
                    on {formatDate(selectedApproval.reviewedAt)}
                  </span>
                  {selectedApproval.reviewNotes && (
                    <p className="mt-1 italic text-slate-500">
                      &ldquo;{selectedApproval.reviewNotes}&rdquo;
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowReviewDialog(false);
                setSelectedApproval(null);
                setReviewNotes("");
              }}
              disabled={processing}
            >
              Close
            </Button>
            {selectedApproval?.status === "pending" && (
              <>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={processing}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Reject
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={processing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Approve & Generate CIDs
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
