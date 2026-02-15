"use client";

// Admin Member Approvals Page
// Allows admins to review, approve, or reject team member submissions from clients.
// Also handles project + member approval requests from the new draft workflow.

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
import {
  getProjectRequestsByStatus,
  ProjectRequest,
} from "@/services/projectRequestService";
import {
  getClientRequestsByInquiry,
  ClientRequest,
} from "@/services/clientRequestService";
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
  FileText,
  Calendar,
} from "lucide-react";

type FilterStatus = "all" | ApprovalStatus;

// Combined approval type for both member approvals and project requests
interface CombinedApproval {
  id: string;
  type: "member" | "project";
  inquiryId: string;
  projectTitle: string;
  projectPid?: string;
  submittedBy: string;
  submittedByName?: string;
  status: ApprovalStatus;
  submittedAt?: any;
  reviewedAt?: any;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewNotes?: string;
  members?: any[];
  // Project-specific fields
  projectData?: {
    title: string;
    projectLead: string;
    startDate: any;
    sendingInstitution: string;
    fundingInstitution: string;
  };
  clientRequests?: ClientRequest[];
}

export default function MemberApprovalsPage() {
  const { user, adminInfo } = useAuth();
  const [approvals, setApprovals] = useState<CombinedApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("pending");
  const [selectedApproval, setSelectedApproval] = useState<CombinedApproval | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch traditional member approvals
      const memberApprovals = await getAllMemberApprovals(
        filterStatus === "all" ? undefined : filterStatus
      );

      // Fetch project requests filtered by status
      const projectRequests = await getProjectRequestsByStatus(
        filterStatus === "all" ? "all" : filterStatus
      );
      console.log("Fetched project requests:", projectRequests);

      // For each project request, fetch associated client requests
      const projectApprovalsPromises = projectRequests.map(async (pr) => {
        try {
          // Get client requests matching the project request status (or all if filtering for all)
          const clientRequests = await getClientRequestsByInquiry(
            pr.inquiryId, 
            filterStatus === "all" ? undefined : filterStatus as any
          );
          
          return {
            id: pr.id || pr.inquiryId,
            type: "project" as const,
            inquiryId: pr.inquiryId,
            projectTitle: pr.title,
            projectPid: pr.pid || "DRAFT",
            submittedBy: pr.requestedBy,
            submittedByName: pr.requestedByName,
            status: pr.status as ApprovalStatus,
            submittedAt: pr.submittedAt,
            reviewedAt: pr.reviewedAt,
            reviewedBy: pr.reviewedBy,
            reviewNotes: pr.rejectionReason,
            projectData: {
              title: pr.title,
              projectLead: pr.projectLead,
              startDate: pr.startDate,
              sendingInstitution: pr.sendingInstitution,
              fundingInstitution: pr.fundingInstitution,
            },
            clientRequests: clientRequests,
            members: clientRequests.map((cr) => ({
              tempId: cr.id,
              isPrimary: cr.isPrimary,
              isValidated: cr.isValidated,
              formData: {
                name: cr.name,
                email: cr.email,
                affiliation: cr.affiliation,
                designation: cr.designation,
                sex: cr.sex,
                phoneNumber: cr.phoneNumber,
                affiliationAddress: cr.affiliationAddress,
              },
            })),
          };
        } catch (error) {
          console.error(`Error fetching client requests for ${pr.inquiryId}:`, error);
          // Return a basic approval without client requests if there's an error
          return {
            id: pr.id || pr.inquiryId,
            type: "project" as const,
            inquiryId: pr.inquiryId,
            projectTitle: pr.title,
            projectPid: pr.pid || "DRAFT",
            submittedBy: pr.requestedBy,
            submittedByName: pr.requestedByName,
            status: pr.status as ApprovalStatus,
            submittedAt: pr.submittedAt,
            reviewedAt: pr.reviewedAt,
            reviewedBy: pr.reviewedBy,
            reviewNotes: pr.rejectionReason,
            projectData: {
              title: pr.title,
              projectLead: pr.projectLead,
              startDate: pr.startDate,
              sendingInstitution: pr.sendingInstitution,
              fundingInstitution: pr.fundingInstitution,
            },
            clientRequests: [],
            members: [],
          };
        }
      });

      const projectApprovals = await Promise.all(projectApprovalsPromises);
      console.log("Combined project approvals:", projectApprovals);

      console.log("Fetched approvals:", {
        projectRequests: projectRequests.length,
        projectApprovals: projectApprovals.length,
        memberApprovals: memberApprovals.length,
      });

      // Convert member approvals to combined format
      const memberApprovalsCombined: CombinedApproval[] = memberApprovals.map((ma) => ({
        id: ma.id!,
        type: "member" as const,
        inquiryId: ma.inquiryId,
        projectTitle: ma.projectTitle,
        projectPid: ma.projectPid,
        submittedBy: ma.submittedBy,
        submittedByName: ma.submittedByName,
        status: ma.status,
        submittedAt: ma.submittedAt,
        reviewedAt: ma.reviewedAt,
        reviewedBy: ma.reviewedBy,
        reviewedByName: ma.reviewedByName,
        reviewNotes: ma.reviewNotes,
        members: ma.members,
      }));

      // Combine both types
      const combined = [...projectApprovals, ...memberApprovalsCombined];
      console.log("Total combined approvals:", combined.length, combined);

      // Sort by submittedAt descending
      combined.sort((a, b) => {
        const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return bTime - aTime;
      });

      console.log("Setting approvals:", {
        total: combined.length,
        byType: {
          project: combined.filter((a) => a.type === "project").length,
          member: combined.filter((a) => a.type === "member").length,
        },
      });

      setApprovals(combined);
    } catch (error) {
      console.error("Failed to fetch approvals:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to load approval requests: ${errorMessage}`);
      setApprovals([]); // Clear approvals on error
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
      if (selectedApproval.type === "member") {
        // Traditional member approval
        const generatedCids = await approveMemberApproval(
          selectedApproval.id,
          user?.email || "",
          adminInfo?.name || user?.displayName || "",
          reviewNotes
        );
        toast.success(
          `Approved! ${generatedCids.length} client ID(s) generated: ${generatedCids.join(", ")}`
        );
      } else if (selectedApproval.type === "project") {
        // New project + members approval
        await approveProjectRequest(selectedApproval);
      }
      
      // Close dialog and reset state first
      setShowReviewDialog(false);
      setSelectedApproval(null);
      setReviewNotes("");
      
      // Then refresh the list
      await fetchApprovals();
    } catch (error) {
      console.error("Approve error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to approve: ${errorMessage}`);
    } finally {
      setProcessing(false);
    }
  };

  const approveProjectRequest = async (approval: CombinedApproval) => {
    if (!approval.projectData || !approval.clientRequests) {
      throw new Error("Missing project data or client requests");
    }

    if (!approval.clientRequests || approval.clientRequests.length === 0) {
      throw new Error("No members found for approval");
    }

    // Import required services
    const { getNextPid } = await import("@/services/projectsService");
    const { getNextCid } = await import("@/services/clientService");
    const { updateProjectRequestStatus } = await import("@/services/projectRequestService");
    const { approveClientRequest } = await import("@/services/clientRequestService");
    const { doc, setDoc, serverTimestamp, Timestamp } = await import("firebase/firestore");
    const { db } = await import("@/lib/firebase");

    const year = new Date().getFullYear();
    
    // Generate PID
    const pid = await getNextPid(year);

    // Convert startDate to proper Timestamp
    let startDate = approval.projectData.startDate;
    if (startDate && typeof startDate.toDate === 'function') {
      startDate = Timestamp.fromDate(startDate.toDate());
    }

    // Generate CIDs for all members
    const memberCids: { email: string; cid: string; isPrimary: boolean }[] = [];
    for (const clientReq of approval.clientRequests) {
      if (!clientReq.email || !clientReq.name) {
        throw new Error(`Invalid member data: missing email or name`);
      }

      const cid = await getNextCid(year);
      memberCids.push({
        email: clientReq.email,
        cid,
        isPrimary: clientReq.isPrimary || false,
      });

      // Create client document
      await setDoc(doc(db, "clients", cid), {
        cid,
        pid: [pid],
        inquiryId: approval.inquiryId,
        name: clientReq.name || "",
        email: clientReq.email || "",
        affiliation: clientReq.affiliation || "",
        designation: clientReq.designation || "",
        sex: clientReq.sex || "",
        phoneNumber: clientReq.phoneNumber || "",
        affiliationAddress: clientReq.affiliationAddress || "",
        isContactPerson: clientReq.isPrimary || false,
        haveSubmitted: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update clientRequest status
      await approveClientRequest(
        approval.inquiryId,
        clientReq.email,
        cid,
        user?.email || ""
      );
    }

    // Create project document
    const clientNames = approval.clientRequests.map((cr) => cr.name || "Unknown");
    await setDoc(doc(db, "projects", pid), {
      pid,
      iid: approval.inquiryId,
      title: approval.projectData.title || "",
      projectLead: approval.projectData.projectLead || "",
      startDate: startDate,
      sendingInstitution: approval.projectData.sendingInstitution || "",
      fundingInstitution: approval.projectData.fundingInstitution || "",
      clientNames,
      status: "Ongoing",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Update project request status
    const primaryCid = memberCids.find((m) => m.isPrimary)?.cid;
    await updateProjectRequestStatus(
      approval.inquiryId,
      "approved",
      user?.email || "",
      pid,
      primaryCid
    );

    // Success message
    const cidList = memberCids.map((m) => m.cid).join(", ");
    toast.success(
      `Project approved! PID: ${pid} | CIDs: ${cidList}`,
      { duration: 6000 }
    );
  };

  const handleReject = async () => {
    if (!selectedApproval?.id) return;
    if (!reviewNotes.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    setProcessing(true);
    
    try {
      if (selectedApproval.type === "member") {
        // Traditional member rejection
        await rejectMemberApproval(
          selectedApproval.id,
          user?.email || "",
          adminInfo?.name || user?.displayName || "",
          reviewNotes
        );
      } else if (selectedApproval.type === "project") {
        // Project rejection
        const { updateProjectRequestStatus } = await import("@/services/projectRequestService");
        await updateProjectRequestStatus(
          selectedApproval.inquiryId,
          "rejected",
          user?.email || "",
          undefined,
          undefined,
          reviewNotes
        );
      }
      
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

  const formatDate = (date: Date | string | any | undefined) => {
    if (!date) return "—";
    try {
      // Handle Firestore Timestamp objects
      if (date && typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
        return date.toDate().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
      // Handle Date objects and strings
      const d = typeof date === "string" ? new Date(date) : date;
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error('Error formatting date:', error, date);
      return "—";
    }
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
                      {approval.type === "project" && (
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200 border">
                          <FileText className="h-3 w-3 mr-1" /> New Project
                        </Badge>
                      )}
                      <CardTitle className="text-lg font-bold text-slate-800">
                        {approval.projectTitle}
                      </CardTitle>
                      {getStatusBadge(approval.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1 font-mono text-xs">
                        <FolderOpen className="h-3.5 w-3.5" />
                        {approval.projectPid}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {approval.submittedByName || approval.submittedBy}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDate(approval.submittedAt)}
                      </span>
                      {approval.type === "project" && approval.projectData && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Start: {formatDate(approval.projectData.startDate)}
                        </span>
                      )}
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
                {approval.type === "project" && approval.projectData && (
                  <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500">Project Lead:</span>{" "}
                        <span className="font-medium text-slate-800">
                          {approval.projectData.projectLead}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Sending Institution:</span>{" "}
                        <span className="font-medium text-slate-800">
                          {approval.projectData.sendingInstitution}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-500">Funding Institution:</span>{" "}
                        <span className="font-medium text-slate-800">
                          {approval.projectData.fundingInstitution}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Users className="h-4 w-4 text-slate-400" />
                  <span className="font-medium">
                    {approval.type === "project"
                      ? `${approval.members?.length || 0} total member(s)`
                      : `${(approval.members || []).filter((m) => !m.isPrimary).length} member(s)`}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span>
                    {approval.type === "project"
                      ? approval.members?.map((m) => m.formData.name || "Unnamed").join(", ")
                      : (approval.members || [])
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
              {selectedApproval?.type === "project" ? "Review New Project Submission" : "Review Member Submission"}
            </DialogTitle>
            <DialogDescription>
              {selectedApproval?.type === "project" ? (
                <>
                  Review the new project and team members submitted for approval.
                </>
              ) : (
                <>
                  Review the team members submitted for{" "}
                  <span className="font-semibold text-slate-700">
                    {selectedApproval?.projectTitle}
                  </span>{" "}
                  (
                  <span className="font-mono text-xs">
                    {selectedApproval?.projectPid}
                  </span>
                  )
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedApproval && (
            <div className="space-y-4 py-4">
              {/* Project Info for project-type approvals */}
              {selectedApproval.type === "project" && selectedApproval.projectData && (
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <h3 className="text-sm font-semibold text-purple-900 flex items-center gap-2 mb-3">
                    <FileText className="h-4 w-4" />
                    Project Details
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="col-span-2">
                      <span className="text-purple-700 font-medium">Title:</span>{" "}
                      <span className="font-semibold text-purple-900">
                        {selectedApproval.projectData.title}
                      </span>
                    </div>
                    <div>
                      <span className="text-purple-700 font-medium">Project Lead:</span>{" "}
                      <span className="text-purple-900">
                        {selectedApproval.projectData.projectLead}
                      </span>
                    </div>
                    <div>
                      <span className="text-purple-700 font-medium">Start Date:</span>{" "}
                      <span className="text-purple-900">
                        {formatDate(selectedApproval.projectData.startDate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-purple-700 font-medium">Sending Institution:</span>{" "}
                      <span className="text-purple-900">
                        {selectedApproval.projectData.sendingInstitution}
                      </span>
                    </div>
                    <div>
                      <span className="text-purple-700 font-medium">Funding Institution:</span>{" "}
                      <span className="text-purple-900">
                        {selectedApproval.projectData.fundingInstitution}
                      </span>
                    </div>
                  </div>
                </div>
              )}

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
                  {selectedApproval.type === "project"
                    ? `Team Members (${selectedApproval.members?.length || 0})`
                    : `Team Members (${(selectedApproval.members || []).filter((m) => !m.isPrimary).length})`}
                </h3>
                {(selectedApproval.type === "project"
                  ? (selectedApproval.members || [])
                  : (selectedApproval.members || []).filter((m) => !m.isPrimary)
                ).map((member, idx) => (
                    <Card key={member.tempId || idx} className="border border-slate-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                            <User className="h-4 w-4 text-[#166FB5]" />
                            {member.formData.name || "Unnamed"}
                            {member.isPrimary && selectedApproval.type === "project" && (
                              <Badge className="bg-amber-100 text-amber-700 border-amber-200 border ml-2">
                                Primary Member
                              </Badge>
                            )}
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
