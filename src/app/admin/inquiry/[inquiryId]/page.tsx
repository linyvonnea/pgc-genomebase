"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, notFound } from "next/navigation";
import { getInquiryById } from "@/services/inquiryService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { logActivity } from "@/services/activityLogService";
import useAuth from "@/hooks/useAuth";
import { PermissionGuard } from "@/components/PermissionGuard";
import { Inquiry } from "@/types/Inquiry";
import { FileText, Calendar, User, Building2, Mail, Briefcase, FlaskConical, DollarSign } from "lucide-react";

// Utility to format date
const formatDate = (val: Date | string | null | undefined): string => {
  if (!val) return "—";
  const date = typeof val === "string" ? new Date(val) : val;
  return isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
};

// Format service type for display
const formatServiceType = (type: string | null | undefined): string => {
  if (!type) return "—";
  return type.charAt(0).toUpperCase() + type.slice(1);
};

// Format workflow type for display
const formatWorkflowType = (type: string | null | undefined): string => {
  if (!type) return "—";
  return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

// Get status badge styling
const getStatusColor = (status: string) => {
  switch (status) {
    case "Pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "Approved Client":
      return "bg-green-100 text-green-800 border-green-200";
    case "Quotation Only":
      return "bg-blue-100 text-blue-800 border-blue-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export default function InquiryDetailPage() {
  return (
    <PermissionGuard module="inquiries" action="view">
      <InquiryDetailContent />
    </PermissionGuard>
  );
}

function InquiryDetailContent() {
  const { adminInfo } = useAuth();
  const { inquiryId } = useParams() as { inquiryId: string };
  const router = useRouter();

  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getInquiryById(inquiryId);
        if (!data) return notFound();

        setInquiry(data);

        // Log VIEW activity
        await logActivity({
          userId: adminInfo?.email || "system",
          userEmail: adminInfo?.email || "system@pgc.admin",
          userName: adminInfo?.name || "System",
          action: "VIEW",
          entityType: "inquiry",
          entityId: inquiryId,
          entityName: `Inquiry from ${data.name}`,
          description: `Viewed inquiry: ${data.name} - ${data.affiliation}`,
        });

        setLoading(false);
      } catch (error) {
        console.error("Error loading inquiry:", error);
        setLoading(false);
      }
    };
    fetch();
  }, [inquiryId, adminInfo]);

  if (loading) return <p className="p-10">Loading inquiry details...</p>;
  if (!inquiry) return notFound();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50/50 to-blue-50/30 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#166FB5] to-[#4038AF] bg-clip-text text-transparent">
                Inquiry Details
              </h1>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">ID:</span>
                  <Badge variant="outline" className="font-mono text-[#F69122] border-[#F69122]/30 bg-[#F69122]/5">
                    {inquiry.id}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">Status:</span>
                  <Badge className={getStatusColor(inquiry.status)}>
                    {inquiry.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">Submitted:</span>
                  <span className="text-sm font-medium text-slate-800">
                    {formatDate(inquiry.createdAt)}
                  </span>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push("/admin/inquiry")}
              className="hover:bg-slate-50 border-slate-200"
            >
              ← Back to List
            </Button>
          </div>
        </div>

        {/* Personal Information Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-gradient-to-r from-[#F69122] to-[#B9273A] rounded-full"></div>
            Personal Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-4 w-4 text-slate-400" />
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Name</span>
                </div>
                <span className="text-sm font-medium text-slate-800">{inquiry.name}</span>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Affiliation / Institution
                  </span>
                </div>
                <span className="text-sm font-medium text-slate-800">{inquiry.affiliation}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Email</span>
                </div>
                <span className="text-sm font-medium text-slate-800">{inquiry.email || "—"}</span>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <Briefcase className="h-4 w-4 text-slate-400" />
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Designation</span>
                </div>
                <span className="text-sm font-medium text-slate-800">{inquiry.designation}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Service Selection Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-gradient-to-r from-[#912ABD] to-[#6E308E] rounded-full"></div>
            Service Selection
          </h2>

          <div className="space-y-4">
            {/* Service Type */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <FlaskConical className="h-4 w-4 text-slate-400" />
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Service Type</span>
              </div>
              <Badge className="w-fit capitalize bg-gradient-to-r from-[#166FB5]/10 to-[#4038AF]/10 text-[#166FB5] border-[#166FB5]/20">
                {formatServiceType(inquiry.serviceType)}
              </Badge>
            </div>

            {/* Research Details Section */}
            {(inquiry.species || inquiry.researchOverview || inquiry.sampleCount || inquiry.workflowType) && (
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <h3 className="text-sm font-semibold text-slate-700">Research Details</h3>

                {inquiry.species && (
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Species</span>
                    <span className="text-sm font-medium text-slate-800 capitalize mt-1">
                      {inquiry.species === 'others' && inquiry.otherSpecies
                        ? `Other: ${inquiry.otherSpecies}`
                        : inquiry.species}
                    </span>
                  </div>
                )}

                {inquiry.sampleCount && (
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Sample Count</span>
                    <span className="text-sm font-medium text-slate-800 mt-1">{inquiry.sampleCount}</span>
                  </div>
                )}

                {inquiry.workflowType && (
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Workflow Type</span>
                    <span className="text-sm font-medium text-slate-800 mt-1">
                      {formatWorkflowType(inquiry.workflowType)}
                    </span>
                  </div>
                )}

                {inquiry.individualAssayDetails && (
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Individual Assay Details
                    </span>
                    <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg">
                      {inquiry.individualAssayDetails}
                    </p>
                  </div>
                )}

                {inquiry.researchOverview && (
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Research Overview
                    </span>
                    <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg">
                      {inquiry.researchOverview}
                    </p>
                  </div>
                )}

                {inquiry.methodologyFileUrl && (
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Methodology File
                    </span>
                    <a
                      href={inquiry.methodologyFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#166FB5] hover:underline mt-1 flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      View Uploaded File
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Legacy Workflows */}
            {inquiry.workflows && inquiry.workflows.length > 0 && (
              <div className="pt-4 border-t border-slate-100">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">
                  Workflows
                </span>
                <div className="flex flex-wrap gap-2">
                  {inquiry.workflows.map((workflow, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="bg-slate-50 text-slate-700 border-slate-200"
                    >
                      {workflow}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Information / Project Background */}
            {(inquiry.additionalInfo || inquiry.projectBackground) && (
              <div className="pt-4 border-t border-slate-100">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">
                  {inquiry.additionalInfo ? "Additional Information" : "Project Background"}
                </span>
                <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg">
                  {inquiry.additionalInfo || inquiry.projectBackground}
                </p>
              </div>
            )}

            {/* Project Budget */}
            {inquiry.projectBudget && (
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-slate-400" />
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Project Budget</span>
                </div>
                <span className="text-sm font-medium text-slate-800">{inquiry.projectBudget}</span>
              </div>
            )}

            {/* Training Specific Fields */}
            {(inquiry.specificTrainingNeed || inquiry.targetTrainingDate || inquiry.numberOfParticipants) && (
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <h3 className="text-sm font-semibold text-slate-700">Training Details</h3>

                {inquiry.specificTrainingNeed && (
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Specific Training Need
                    </span>
                    <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg">
                      {inquiry.specificTrainingNeed}
                    </p>
                  </div>
                )}

                {inquiry.targetTrainingDate && (
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Target Training Date
                      </span>
                    </div>
                    <span className="text-sm font-medium text-slate-800">{inquiry.targetTrainingDate}</span>
                  </div>
                )}

                {inquiry.numberOfParticipants && (
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Number of Participants
                    </span>
                    <span className="text-sm font-medium text-slate-800 mt-1">{inquiry.numberOfParticipants}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* System Information Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-gradient-to-r from-[#4038AF] to-[#166FB5] rounded-full"></div>
            System Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Approved Status</span>
              <Badge className={`w-fit mt-1 ${inquiry.isApproved ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                {inquiry.isApproved ? "Approved" : "Not Approved"}
              </Badge>
            </div>

            <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Client Portal Submitted</span>
              <Badge className={`w-fit mt-1 ${inquiry.haveSubmitted ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}>
                {inquiry.haveSubmitted ? "Yes" : "No"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Actions Card */}
        <div className="bg-gradient-to-r from-[#F69122]/5 via-[#B9273A]/5 to-[#912ABD]/5 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
          <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <div className="w-2 h-2 bg-gradient-to-r from-[#F69122] to-[#912ABD] rounded-full"></div>
            Available Actions
          </h2>
          <p className="text-sm text-slate-600 mb-4">Create a quotation for this inquiry</p>

          <Button
            onClick={() => router.push(`/admin/quotations/new?inquiryId=${inquiry.id}`)}
            className="bg-gradient-to-r from-[#166FB5] to-[#4038AF] hover:from-[#145a9b] hover:to-[#362f8f] text-white font-medium px-6 py-2 rounded-lg transition-all duration-200 shadow-lg"
          >
            Create Quotation
          </Button>
        </div>
      </div>
    </div>
  );
}
