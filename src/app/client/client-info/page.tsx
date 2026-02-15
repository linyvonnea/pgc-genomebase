"use client";

// Client Portal — Two-Panel Layout
// Left pane (1/4): Projects navigation sidebar
// Right pane (3/4): Selected project details + team member management

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { clientFormSchema, ClientFormData } from "@/schemas/clientSchema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getNextCid } from "@/services/clientService";
import {
  saveMemberApproval,
  submitForApproval,
  getMemberApproval,
} from "@/services/memberApprovalService";
import {
  getProjectRequest,
  saveProjectRequest,
  submitProjectForApproval,
  subscribeToProjectRequest,
  ProjectRequest,
} from "@/services/projectRequestService";
import {
  saveClientRequest,
  getClientRequestsByInquiry,
  submitClientRequestsForApproval,
  ClientRequest,
} from "@/services/clientRequestService";
import { ApprovalStatus } from "@/types/MemberApproval";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import ConfirmationModalLayout from "@/components/modal/ConfirmationModalLayout";
import { useApprovalStatus } from "@/hooks/useApprovalStatus";
import {
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FolderOpen,
  Calendar,
  Building2,
  User,
  Users,
  Save,
  Trash2,
  Clock,
  ShieldCheck,
  XCircle,
  Send,
  PartyPopper,
  Sparkles,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ────────────────────────────────────────────────────────────────
//  Types
// ────────────────────────────────────────────────────────────────

interface ClientMember {
  id: string;
  cid: string;
  formData: ClientFormData;
  errors: Partial<Record<keyof ClientFormData, string>>;
  isSubmitted: boolean;
  isPrimary: boolean;
  isDraft?: boolean;
}

interface ProjectDetails {
  pid: string;
  title: string;
  lead: string;
  startDate: Date | string;
  sendingInstitution: string;
  fundingInstitution: string;
  status: string;
  inquiryId: string;
  isDraft?: boolean; // Flag for draft project requests
}

// ────────────────────────────────────────────────────────────────
//  Component
// ────────────────────────────────────────────────────────────────

export default function ClientPortalPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const emailParam = searchParams.get("email");
  const inquiryIdParam = searchParams.get("inquiryId");
  const pidParam = searchParams.get("pid");

  // ── UI state ──────────────────────────────────────────────────
  const [showProjectsList, setShowProjectsList] = useState(true);
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(
    new Set(["primary"])
  );
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // ── Data state ────────────────────────────────────────────────
  const [members, setMembers] = useState<ClientMember[]>([]);
  const [projects, setProjects] = useState<ProjectDetails[]>([]);
  const [selectedProjectPid, setSelectedProjectPid] = useState<string | null>(
    null
  );
  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(
    null
  );
  const [projectRequest, setProjectRequest] = useState<ProjectRequest | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ── Modal state ───────────────────────────────────────────────
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  const [showSubmitForApprovalModal, setShowSubmitForApprovalModal] =
    useState(false);
  const [showSubmitProjectModal, setShowSubmitProjectModal] = useState(false);

  // ── Approval state ────────────────────────────────────────────
  const [approvalStatus, setApprovalStatus] =
    useState<ApprovalStatus | null>(null);
  const [showApprovalCelebration, setShowApprovalCelebration] = useState(false);
  const [previousApprovalStatus, setPreviousApprovalStatus] =
    useState<ApprovalStatus | null>(null);

  const approvalStatusData = useApprovalStatus(
    inquiryIdParam,
    selectedProjectPid
  );

  // ────────────────────────────────────────────────────────────────
  //  Initialisation
  // ────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function initializePrimaryMember() {
      if (!emailParam || !inquiryIdParam) {
        router.replace("/portal");
        return;
      }

      setLoading(true);
      try {
        // Check for draft project first (used for both primary member and project list)
        const draftProjectRequest = await getProjectRequest(inquiryIdParam);
        
        let primaryMember: ClientMember;
        let primaryClientSnapshot: any = null; // Store for later PID linking
        const clientsRef = collection(db, "clients");
        
        // Load all draft and pending client requests for this inquiry (new workflow)
        const allClientRequests = await getClientRequestsByInquiry(inquiryIdParam);
        const draftClientRequests = allClientRequests.filter(r => r.status === "draft" || r.status === "pending");
        const primaryDraftRequest = draftClientRequests.find(r => r.email.toLowerCase() === emailParam.toLowerCase());
        
        if (primaryDraftRequest) {
          // Load primary member from draft client request
          primaryMember = {
            id: "primary",
            cid: "draft",
            formData: {
              name: primaryDraftRequest.name,
              email: primaryDraftRequest.email,
              affiliation: primaryDraftRequest.affiliation,
              designation: primaryDraftRequest.designation,
              sex: primaryDraftRequest.sex,
              phoneNumber: primaryDraftRequest.phoneNumber,
              affiliationAddress: primaryDraftRequest.affiliationAddress,
            },
            errors: {},
            isSubmitted: !!primaryDraftRequest.isValidated, // Check if user has saved the form
            isPrimary: true,
            isDraft: true,
          };
        } else {
          // Check if primary member already exists in clients collection
          const clientQuery = query(
            clientsRef,
            where("email", "==", emailParam),
            where("inquiryId", "==", inquiryIdParam)
          );
          const clientSnapshot = await getDocs(clientQuery);
          primaryClientSnapshot = clientSnapshot; // Store for later use

          if (!clientSnapshot.empty) {
            const clientDoc = clientSnapshot.docs[0];
            const data = clientDoc.data();
            primaryMember = {
              id: "primary",
              cid: clientDoc.id,
              formData: {
                name: data.name || "",
                email: data.email || emailParam,
                affiliation: data.affiliation || "",
                designation: data.designation || "",
                sex: data.sex || "M",
                phoneNumber: data.phoneNumber || "",
                affiliationAddress: data.affiliationAddress || "",
              },
              errors: {},
              isSubmitted: !!data.haveSubmitted,
              isPrimary: true,
            };
          } else {
            primaryMember = {
              id: "primary",
              cid: "pending",
              formData: {
                name: "",
                email: emailParam,
                affiliation: "",
                designation: "",
                sex: "M",
                phoneNumber: "",
                affiliationAddress: "",
              },
              errors: {},
              isSubmitted: false,
              isPrimary: true,
            };
          }
        }

        // Load additional team members from both clientRequests (drafts) and clients (approved)
        const additionalDraftMembers: ClientMember[] = draftClientRequests
          .filter(r => r.email.toLowerCase() !== emailParam.toLowerCase())
          .map((r, index) => ({
            id: `draft-member-${index + 1}`,
            cid: "draft",
            formData: {
              name: r.name,
              email: r.email,
              affiliation: r.affiliation,
              designation: r.designation,
              sex: r.sex,
              phoneNumber: r.phoneNumber,
              affiliationAddress: r.affiliationAddress,
            },
            errors: {},
            isSubmitted: !!r.isValidated,
            isPrimary: false,
            isDraft: true,
          }));

        const allMembersQuery = query(
          clientsRef,
          where("inquiryId", "==", inquiryIdParam)
        );
        const allMembersSnapshot = await getDocs(allMembersQuery);

        const approvedMembers: ClientMember[] = allMembersSnapshot.docs
          .filter((d) => {
            const email = d.data().email;
            if (!email) return true;
            return email.toLowerCase() !== emailParam.toLowerCase();
          })
          .map((d, index) => {
            const data = d.data();
            return {
              id: `member-${index + 1}`,
              cid: d.id,
              formData: {
                name: data.name || "",
                email: data.email || "",
                affiliation: data.affiliation || "",
                designation: data.designation || "",
                sex: data.sex || "M",
                phoneNumber: data.phoneNumber || "",
                affiliationAddress: data.affiliationAddress || "",
              },
              errors: {},
              isSubmitted: !!data.haveSubmitted,
              isPrimary: false,
              isDraft: false,
            };
          });

        // Combine draft and approved members
        const additionalMembers = [...additionalDraftMembers, ...approvedMembers];

        // Fetch all projects for this inquiry
        const projectsRef = collection(db, "projects");
        const projectsQuery = query(
          projectsRef,
          where("iid", "==", inquiryIdParam)
        );
        const projectsSnapshot = await getDocs(projectsQuery);

        const fetchedProjects: ProjectDetails[] = [];
        const allProjectPids: string[] = [];
        let fetchedProjectDetails: ProjectDetails | null = null;

        // Show draft/pending/rejected project requests (not yet approved)
        if (draftProjectRequest && ["draft", "pending", "rejected"].includes(draftProjectRequest.status)) {
          console.log(`Found ${draftProjectRequest.status} project request`);
          setProjectRequest(draftProjectRequest);
          const statusLabel = draftProjectRequest.status === "draft" ? "Draft" : 
                            draftProjectRequest.status === "pending" ? "Pending Approval" :
                            "Rejected";
          const draftProject: ProjectDetails = {
            pid: draftProjectRequest.status === "draft" ? "DRAFT" : `PENDING-${inquiryIdParam.slice(-6)}`,
            title: draftProjectRequest.title || "Draft Project",
            lead: draftProjectRequest.projectLead || "Not specified",
            startDate: draftProjectRequest.startDate?.toDate?.() || new Date(),
            sendingInstitution:
              draftProjectRequest.sendingInstitution || "Not specified",
            fundingInstitution:
              draftProjectRequest.fundingInstitution || "Not specified",
            status: statusLabel,
            inquiryId: inquiryIdParam,
            isDraft: true,
          };
          fetchedProjects.push(draftProject);
          fetchedProjectDetails = draftProject;
        }

        projectsSnapshot.forEach((projectDoc) => {
          const projectData = projectDoc.data();
          const project: ProjectDetails = {
            pid: projectData.pid || projectDoc.id,
            title: projectData.title || "Untitled Project",
            lead: projectData.lead || "Not specified",
            startDate:
              projectData.startDate?.toDate?.() ||
              projectData.startDate ||
              new Date(),
            sendingInstitution:
              projectData.sendingInstitution || "Not specified",
            fundingInstitution:
              projectData.fundingInstitution || "Not specified",
            status: projectData.status || "Pending",
            inquiryId: projectData.iid || inquiryIdParam || "",
          };
          fetchedProjects.push(project);
          allProjectPids.push(project.pid);
          if (pidParam && projectData.pid === pidParam) {
            fetchedProjectDetails = project;
          }
        });

        if (!fetchedProjectDetails && fetchedProjects.length > 0) {
          fetchedProjectDetails = fetchedProjects[0];
        }

        // Auto-link any missing PIDs to primary member's record (only for non-draft projects)
        if (primaryClientSnapshot && !primaryClientSnapshot.empty && allProjectPids.length > 0) {
          const clientDoc = primaryClientSnapshot.docs[0];
          const clientData = clientDoc.data();
          const currentPids = Array.isArray(clientData.pid)
            ? clientData.pid
            : clientData.pid
            ? [clientData.pid]
            : [];
          const missingPids = allProjectPids.filter(
            (pid) => !currentPids.includes(pid)
          );
          if (missingPids.length > 0) {
            const updatedPids = [
              ...new Set([...currentPids, ...missingPids]),
            ];
            await setDoc(
              doc(db, "clients", clientDoc.id),
              { pid: updatedPids },
              { merge: true }
            );
            toast.info(
              `Linked ${missingPids.length} additional project(s) to your profile`
            );
          }
        }

        setProjects(fetchedProjects);
        if (fetchedProjectDetails) {
          setSelectedProjectPid(fetchedProjectDetails.pid);
          setProjectDetails(fetchedProjectDetails);
        }

        // Load draft / pending members from memberApprovals (old workflow only)
        // Don't load if we already have clientRequests (new workflow)
        let draftMembers: ClientMember[] = [];
        const selectedPid =
          fetchedProjectDetails?.pid || pidParam || "";
        
        // Only load member approvals for non-draft, approved projects that use old workflow
        // Skip if we have clientRequests (new workflow handles this)
        const hasClientRequests = draftClientRequests.length > 0;
        if (selectedPid && !selectedPid.startsWith("DRAFT") && !selectedPid.startsWith("PENDING") && inquiryIdParam && !hasClientRequests) {
          const approval = await getMemberApproval(
            inquiryIdParam,
            selectedPid
          );
          if (approval) {
            setApprovalStatus(approval.status);
            if (
              approval.status === "draft" ||
              approval.status === "pending" ||
              approval.status === "rejected"
            ) {
              draftMembers = approval.members
                .filter((m) => !m.isPrimary)
                .map((m, index) => ({
                  id: m.tempId || `memberApproval-${index + 1}`,
                  cid: "",
                  formData: m.formData,
                  errors: {},
                  isSubmitted: m.isValidated,
                  isPrimary: false,
                  isDraft: true,
                }));
            }
          }
        }

        setMembers([primaryMember, ...additionalMembers, ...draftMembers]);
        setExpandedMembers(new Set(["primary"]));
      } catch (error) {
        console.error("Error initializing form:", error);
        toast.error(
          `Failed to load member data: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      } finally {
        setLoading(false);
      }
    }

    initializePrimaryMember();
  }, [emailParam, inquiryIdParam, pidParam, router]);

  // ────────────────────────────────────────────────────────────────
  //  Approval-status watcher
  // ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!approvalStatusData.status) return;

    setApprovalStatus(approvalStatusData.status);

    if (
      approvalStatusData.status === "approved" &&
      previousApprovalStatus !== "approved" &&
      previousApprovalStatus !== null
    ) {
      setShowApprovalCelebration(true);
      toast.success(
        "🎉 Congratulations! Your team members have been approved and registered!",
        { duration: 5000 }
      );

      if (selectedProjectPid && inquiryIdParam && emailParam) {
        const reloadMembers = async () => {
          try {
            const clientsRef = collection(db, "clients");
            const allMembersQuery = query(
              clientsRef,
              where("inquiryId", "==", inquiryIdParam),
              where("pid", "array-contains", selectedProjectPid)
            );
            const allMembersSnapshot = await getDocs(allMembersQuery);

            const reloadedMembers: ClientMember[] =
              allMembersSnapshot.docs.map((d, index) => {
                const data = d.data();
                const isPrimary =
                  data.email?.toLowerCase() === emailParam.toLowerCase();
                return {
                  id: isPrimary ? "primary" : `member-${index + 1}`,
                  cid: d.id,
                  formData: {
                    name: data.name || "",
                    email: data.email || "",
                    affiliation: data.affiliation || "",
                    designation: data.designation || "",
                    sex: data.sex || "M",
                    phoneNumber: data.phoneNumber || "",
                    affiliationAddress: data.affiliationAddress || "",
                  },
                  errors: {},
                  isSubmitted: !!data.haveSubmitted,
                  isPrimary,
                  isDraft: false,
                };
              });
            setMembers(reloadedMembers);
          } catch (error) {
            console.error("Error reloading members:", error);
          }
        };
        reloadMembers();
      }

      setTimeout(() => setShowApprovalCelebration(false), 10000);
    }

    setPreviousApprovalStatus(approvalStatusData.status);
  }, [
    approvalStatusData,
    previousApprovalStatus,
    selectedProjectPid,
    inquiryIdParam,
    emailParam,
  ]);

  // ────────────────────────────────────────────────────────────────
  //  Handlers
  // ────────────────────────────────────────────────────────────────

  const handleAddMember = () => {
    if (!selectedProjectPid) {
      toast.error("Please select a project first");
      return;
    }
    if (approvalStatus === "pending") {
      toast.error("Cannot add members while approval is pending");
      return;
    }

    const newMemberId = `draft-${Date.now()}`;
    const newMember: ClientMember = {
      id: newMemberId,
      cid: "",
      formData: {
        name: "",
        email: "",
        affiliation: "",
        designation: "",
        sex: "M",
        phoneNumber: "",
        affiliationAddress: "",
      },
      errors: {},
      isSubmitted: false,
      isPrimary: false,
      isDraft: true,
    };

    setMembers((prev) => [newMember, ...prev]);
    setExpandedMembers((prev) => new Set([...prev, newMemberId]));
    toast.success("New member added as draft");
    console.log("✅ Member added at top:", newMemberId, "Total members:", members.length + 1);
  };

  const handleRemoveMember = (memberId: string) => {
    if (projectDetails?.status === "Completed") {
      toast.error("Cannot remove members from a completed project");
      return;
    }
    setMemberToDelete(memberId);
    setShowDeleteModal(true);
  };

  const confirmRemoveMember = async () => {
    if (!memberToDelete) return;
    const member = members.find((m) => m.id === memberToDelete);
    if (!member) return;

    try {
      if (!member.isDraft && member.cid) {
        await deleteDoc(doc(db, "clients", member.cid));
      }

      const updatedMembers = members.filter((m) => m.id !== memberToDelete);
      setMembers(updatedMembers);

      // Update memberApprovals if draft member removed
      if (member.isDraft && selectedProjectPid && inquiryIdParam) {
        const remainingDrafts = updatedMembers.filter(
          (m) => m.isDraft && !m.isPrimary
        );
        if (remainingDrafts.length > 0) {
          await saveMemberApproval({
            inquiryId: inquiryIdParam,
            projectPid: selectedProjectPid,
            projectTitle: projectDetails?.title || "",
            submittedBy: emailParam || "",
            submittedByName:
              members.find((m) => m.isPrimary)?.formData.name || "",
            status:
              approvalStatus === "rejected"
                ? "draft"
                : approvalStatus || "draft",
            members: remainingDrafts.map((m) => ({
              tempId: m.id,
              isPrimary: false,
              isValidated: m.isSubmitted,
              formData: m.formData,
            })),
          });
        }
      }

      // Collapse deleted member
      setExpandedMembers((prev) => {
        const next = new Set(prev);
        next.delete(memberToDelete);
        return next;
      });

      toast.success(
        member.isDraft
          ? "Draft member removed"
          : "Member removed and deleted from database"
      );
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
    } finally {
      setShowDeleteModal(false);
      setMemberToDelete(null);
    }
  };

  const handleChange = (
    memberId: string,
    field: keyof ClientFormData,
    value: string
  ) => {
    setMembers((prev) =>
      prev.map((member) =>
        member.id === memberId
          ? { ...member, formData: { ...member.formData, [field]: value } }
          : member
      )
    );
  };

  const handleSubmitMember = (memberId: string) => {
    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    const result = clientFormSchema.safeParse(member.formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ClientFormData, string>> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof ClientFormData;
        fieldErrors[field] = err.message;
      });
      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId ? { ...m, errors: fieldErrors } : m
        )
      );
      toast.error("Please fix validation errors");
    } else {
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, errors: {} } : m))
      );
      setPendingMemberId(memberId);
      setShowConfirmModal(true);
    }
  };

  const handleConfirmSave = async () => {
    if (!pendingMemberId) return;
    const member = members.find((m) => m.id === pendingMemberId);
    if (!member) return;

    setShowConfirmModal(false);
    setSubmitting(true);

    try {
      const result = clientFormSchema.safeParse(member.formData);
      if (!result.success) {
        toast.error("Invalid data");
        setSubmitting(false);
        return;
      }

      // Check if this is a draft project
      const isDraftProject = projectDetails?.isDraft || projectDetails?.pid === "DRAFT";

      if (isDraftProject && inquiryIdParam) {
        // For draft projects, save ALL members to clientRequests collection
        await saveClientRequest({
          inquiryId: inquiryIdParam,
          requestedBy: emailParam || "",
          requestedByName: members.find((m) => m.isPrimary)?.formData.name || result.data.name,
          name: result.data.name,
          email: result.data.email,
          affiliation: result.data.affiliation,
          designation: result.data.designation,
          sex: result.data.sex,
          phoneNumber: result.data.phoneNumber,
          affiliationAddress: result.data.affiliationAddress,
          isPrimary: member.isPrimary,
          isValidated: true,
          status: "draft",
        });

        setMembers((prev) =>
          prev.map((m) =>
            m.id === pendingMemberId
              ? { ...m, isSubmitted: true, isDraft: true, cid: "draft" }
              : m
          )
        );
        toast.success(`${member.isPrimary ? "Primary member" : "Team member"} information saved to draft!`);
      } else {
        // For approved projects, save to clients collection
        let pids: string[] = projects.map((p) => p.pid).filter(pid => pid !== "DRAFT");
        if (pids.length === 0 && pidParam) pids = [pidParam];

        let cidToUse = member.cid;
        if (cidToUse === "pending" || cidToUse === "draft") {
          const year = new Date().getFullYear();
          cidToUse = await getNextCid(year);
        }

        await setDoc(
          doc(db, "clients", cidToUse),
          {
            ...result.data,
            cid: cidToUse,
            pid: pids,
            inquiryId: inquiryIdParam,
            isContactPerson: member.isPrimary,
            haveSubmitted: true,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        // Update project's clientNames array
        const currentPid = selectedProjectPid || pidParam;
        if (currentPid && currentPid !== "DRAFT") {
          const projectDocRef = doc(db, "projects", currentPid);
          const projectSnap = await getDoc(projectDocRef);
          if (projectSnap.exists()) {
            const clientNames = projectSnap.data().clientNames || [];
            if (!clientNames.includes(result.data.name)) {
              await setDoc(
                projectDocRef,
                { clientNames: [...clientNames, result.data.name] },
                { merge: true }
              );
            }
          }
        }

        setMembers((prev) =>
          prev.map((m) =>
            m.id === pendingMemberId
              ? { ...m, cid: cidToUse, isSubmitted: true }
              : m
          )
        );
        toast.success("Your information saved successfully!");
      }
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Failed to save information");
    } finally {
      setSubmitting(false);
      setPendingMemberId(null);
    }
  };

  const handleSaveDraft = async (memberId: string) => {
    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    setSubmitting(true);
    try {
      // Check if this is a draft project
      const isDraftProject = projectDetails?.isDraft || projectDetails?.pid === "DRAFT";

      if (isDraftProject && inquiryIdParam) {
        // For draft projects, save to clientRequests collection (without validation)
        await saveClientRequest({
          inquiryId: inquiryIdParam,
          requestedBy: emailParam || "",
          requestedByName: members.find((m) => m.isPrimary)?.formData.name || member.formData.name || "",
          name: member.formData.name,
          email: member.formData.email,
          affiliation: member.formData.affiliation,
          designation: member.formData.designation,
          sex: member.formData.sex,
          phoneNumber: member.formData.phoneNumber,
          affiliationAddress: member.formData.affiliationAddress,
          isPrimary: member.isPrimary,
          isValidated: false,
          status: "draft",
        });

        setMembers((prev) =>
          prev.map((m) =>
            m.id === memberId ? { ...m, isDraft: true, cid: "draft" } : m
          )
        );
        toast.success("Draft saved for member");
      } else {
        // For approved projects, save to clients collection
        if (member.isPrimary) {
          let pids: string[] = projects.map((p) => p.pid).filter(pid => pid !== "DRAFT");
          if (pids.length === 0 && pidParam) pids = [pidParam];

          let cidToUse = member.cid;
          if (cidToUse === "pending" || cidToUse === "draft") {
            const year = new Date().getFullYear();
            cidToUse = await getNextCid(year);
          }

          await setDoc(
            doc(db, "clients", cidToUse),
            {
              ...member.formData,
              cid: cidToUse,
              pid: pids,
              inquiryId: inquiryIdParam,
              isContactPerson: true,
              haveSubmitted: false,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );

          setMembers((prev) =>
            prev.map((m) =>
              m.id === memberId ? { ...m, cid: cidToUse } : m
            )
          );
          toast.success("Draft saved for your information");
        } else {
          if (selectedProjectPid && inquiryIdParam) {
            const draftMembers = members.filter(
              (m) => m.isDraft && !m.isPrimary
            );
            await saveMemberApproval({
              inquiryId: inquiryIdParam,
              projectPid: selectedProjectPid,
              projectTitle: projectDetails?.title || "",
              submittedBy: emailParam || "",
              submittedByName:
                members.find((m) => m.isPrimary)?.formData.name || "",
              status:
                approvalStatus === "rejected"
                  ? "draft"
                  : approvalStatus || "draft",
              members: draftMembers.map((m) => ({
                tempId: m.id,
                isPrimary: false,
                isValidated: m.isSubmitted,
                formData: m.formData,
              })),
            });
            toast.success("Draft saved for team member");
          }
        }
      }
    } catch (error) {
      console.error("Draft save error:", error);
      toast.error("Failed to save draft");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalSubmit = () => {
    // Check if all members are validated
    const unsavedCount = members.filter((m) => !m.isSubmitted).length;
    if (unsavedCount > 0) {
      toast.error(
        `Please save/validate all ${unsavedCount} member(s) before submitting for approval`
      );
      return;
    }

    // Check if this is a draft project
    if (projectDetails?.isDraft) {
      // For draft projects, submit project + primary member
      handleSubmitProjectForApproval();
      return;
    }

    // For approved projects, submit additional team members
    const primary = members.find((m) => m.isPrimary);
    if (primary && !primary.isSubmitted) {
      toast.error("Please save your (primary member) information first");
      return;
    }

    const draftMembers = members.filter((m) => m.isDraft && !m.isPrimary);
    if (draftMembers.length === 0) {
      toast.error("Please add at least one team member");
      return;
    }

    const allDraftsValidated = draftMembers.every((m) => m.isSubmitted);
    if (!allDraftsValidated) {
      toast.error(
        "Please save all member information before submitting for approval"
      );
      return;
    }

    setShowSubmitForApprovalModal(true);
  };

  const handleConfirmSubmitForApproval = async () => {
    setShowSubmitForApprovalModal(false);
    setSubmitting(true);

    try {
      if (!selectedProjectPid || !inquiryIdParam) {
        toast.error("Missing project context");
        return;
      }

      const draftMembers = members.filter((m) => m.isDraft && !m.isPrimary);

      await submitForApproval(
        inquiryIdParam,
        selectedProjectPid,
        projectDetails?.title || "",
        emailParam || "",
        members.find((m) => m.isPrimary)?.formData.name || "",
        draftMembers.map((m) => ({
          tempId: m.id,
          isPrimary: false,
          isValidated: true,
          formData: m.formData,
        }))
      );

      setApprovalStatus("pending");
      toast.success(
        "Team members submitted for admin approval! You will be notified once reviewed."
      );
    } catch (error) {
      console.error("Submit for approval error:", error);
      toast.error("Failed to submit for approval");
    } finally {
      setSubmitting(false);
    }
  };

  // ────────────────────────────────────────────────────────────────
  // Project Submission (Project + Primary Member)
  // ────────────────────────────────────────────────────────────────

  const handleSubmitProjectForApproval = () => {
    // Validate primary member data
    const primaryMember = members.find((m) => m.isPrimary);
    if (!primaryMember) {
      toast.error("Primary member not found");
      return;
    }

    if (!primaryMember.isSubmitted) {
      toast.error("Please save your information as Primary Member first");
      return;
    }

    const result = clientFormSchema.safeParse(primaryMember.formData);
    if (!result.success) {
      toast.error("Please complete all required fields for the primary member");
      const fieldErrors: Partial<Record<keyof ClientFormData, string>> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof ClientFormData;
        fieldErrors[field] = err.message;
      });
      setMembers((prev) =>
        prev.map((m) =>
          m.isPrimary ? { ...m, errors: fieldErrors } : m
        )
      );
      return;
    }

    if (!projectRequest) {
      toast.error("No draft project found");
      return;
    }

    setShowSubmitProjectModal(true);
  };

  const handleConfirmSubmitProject = async () => {
    setShowSubmitProjectModal(false);
    setSubmitting(true);

    try {
      if (!inquiryIdParam || !emailParam || !projectRequest) {
        toast.error("Missing required information");
        return;
      }

      const primaryMember = members.find((m) => m.isPrimary);
      if (!primaryMember) {
        toast.error("Primary member not found");
        return;
      }

      console.log("Submitting project for approval:", {
        inquiryId: inquiryIdParam,
        email: emailParam,
        title: projectRequest.title,
      });

      // Submit all client requests for approval (both primary and team members)
      await submitClientRequestsForApproval(inquiryIdParam);
      console.log("Client requests submitted for approval");

      // Submit project for approval (without primary member in project data since it's now in clientRequests)
      await submitProjectForApproval(
        inquiryIdParam,
        emailParam,
        primaryMember.formData.name || emailParam,
        {
          title: projectRequest.title,
          projectLead: projectRequest.projectLead,
          startDate: projectRequest.startDate.toDate(),
          sendingInstitution: projectRequest.sendingInstitution,
          fundingInstitution: projectRequest.fundingInstitution,
        },
        primaryMember.formData
      );
      console.log("Project request submitted for approval");

      toast.success(
        "Project and all team members submitted for approval! You will be notified when reviewed.",
        { duration: 5000 }
      );

      // Update local state to reflect pending status
      setProjectDetails((prev) =>
        prev ? { ...prev, status: "Pending Approval", isDraft: false } : prev
      );
      
      // Update approval status to pending
      setApprovalStatus("pending");
      
      // Update all members to show pending status
      setMembers((prev) =>
        prev.map((m) => ({
          ...m,
          isSubmitted: true,
          isDraft: false,
          cid: m.cid === "draft" ? "pending" : m.cid,
        }))
      );
      
      // Refresh project request to get updated status
      if (inquiryIdParam) {
        const updatedProjectRequest = await getProjectRequest(inquiryIdParam);
        if (updatedProjectRequest) {
          setProjectRequest(updatedProjectRequest);
        }
      }
    } catch (error) {
      console.error("Submit project error:", error);
      toast.error("Failed to submit project for approval");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectProject = async (project: ProjectDetails) => {
    setSelectedProjectPid(project.pid);
    setProjectDetails(project);

    try {
      const clientsRef = collection(db, "clients");
      const projectMembersQuery = query(
        clientsRef,
        where("inquiryId", "==", inquiryIdParam),
        where("pid", "array-contains", project.pid)
      );
      const projectMembersSnapshot = await getDocs(projectMembersQuery);

      let primaryM: ClientMember | null = null;
      const additionalM: ClientMember[] = [];

      projectMembersSnapshot.docs.forEach((d, index) => {
        const data = d.data();
        const email = data.email;

        if (email && email.toLowerCase() === emailParam!.toLowerCase()) {
          primaryM = {
            id: "primary",
            cid: d.id,
            formData: {
              name: data.name || "",
              email: data.email || emailParam,
              affiliation: data.affiliation || "",
              designation: data.designation || "",
              sex: data.sex || "M",
              phoneNumber: data.phoneNumber || "",
              affiliationAddress: data.affiliationAddress || "",
            },
            errors: {},
            isSubmitted: !!data.haveSubmitted,
            isPrimary: true,
          };
        } else {
          additionalM.push({
            id: `member-${index + 1}`,
            cid: d.id,
            formData: {
              name: data.name || "",
              email: data.email || "",
              affiliation: data.affiliation || "",
              designation: data.designation || "",
              sex: data.sex || "M",
              phoneNumber: data.phoneNumber || "",
              affiliationAddress: data.affiliationAddress || "",
            },
            errors: {},
            isSubmitted: !!data.haveSubmitted,
            isPrimary: false,
            isDraft: false,
          });
        }
      });

      // Load draft/pending members
      let draftM: ClientMember[] = [];
      if (inquiryIdParam) {
        const approval = await getMemberApproval(inquiryIdParam, project.pid);
        if (approval) {
          setApprovalStatus(approval.status);
          if (
            approval.status === "draft" ||
            approval.status === "pending" ||
            approval.status === "rejected"
          ) {
            draftM = approval.members
              .filter((m) => !m.isPrimary)
              .map((m, index) => ({
                id: m.tempId || `draft-${index + 1}`,
                cid: "",
                formData: m.formData,
                errors: {},
                isSubmitted: m.isValidated,
                isPrimary: false,
                isDraft: true,
              }));
          }
        } else {
          setApprovalStatus(null);
        }
      }

      const projectMembers = primaryM
        ? [primaryM, ...additionalM, ...draftM]
        : [...additionalM, ...draftM];
      setMembers(projectMembers);
      setExpandedMembers(new Set(["primary"]));
    } catch (error) {
      console.error("Error loading project members:", error);
      toast.error("Failed to load project members");
    }
  };

  const handleCreateNewProject = () => {
    const params = new URLSearchParams({
      email: emailParam!,
      inquiryId: inquiryIdParam!,
      new: "true",
    });
    router.push(`/client/project-info?${params.toString()}`);
  };

  // ────────────────────────────────────────────────────────────────
  //  Helpers
  // ────────────────────────────────────────────────────────────────

  const getMemberStatus = (member: ClientMember) => {
    if (member.isDraft && approvalStatus === "pending")
      return {
        label: "Pending Approval",
        color: "bg-orange-500",
        icon: Clock,
      };
    if (member.isDraft && approvalStatus === "rejected")
      return { label: "Rejected", color: "bg-red-500", icon: XCircle };
    if (member.isSubmitted)
      return {
        label: member.isDraft ? "Validated" : "Completed",
        color: member.isDraft ? "bg-blue-500" : "bg-green-500",
        icon: CheckCircle2,
      };
    if (Object.keys(member.errors).length > 0)
      return { label: "Error", color: "bg-red-500", icon: AlertCircle };
    return { label: "Draft", color: "bg-yellow-500", icon: Loader2 };
  };

  const toggleMemberExpand = (memberId: string) => {
    setExpandedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  const formatDate = (date: Date | string) => {
    try {
      const d = typeof date === "string" ? new Date(date) : date;
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  const statusColors: Record<string, string> = {
    Draft: "bg-slate-100 text-slate-700 border-slate-200",
    "Pending Approval": "bg-orange-100 text-orange-700 border-orange-200",
    Rejected: "bg-red-100 text-red-700 border-red-200",
    Pending: "bg-blue-100 text-blue-700 border-blue-200",
    Ongoing: "bg-green-100 text-green-700 border-green-200",
    Completed: "bg-gray-100 text-gray-700 border-gray-200",
    Cancelled: "bg-red-100 text-red-700 border-red-200",
  };

  // ────────────────────────────────────────────────────────────────
  //  Early returns (loading / error)
  // ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-50/50 to-blue-50/30">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#166FB5] mb-2" />
          <p className="text-slate-600">Loading portal...</p>
        </div>
      </div>
    );
  }

  if (!emailParam || !inquiryIdParam) return null;

  if (!loading && members.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-50/50 to-blue-50/30 p-6">
        <div className="max-w-md bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            Unable to Load Portal
          </h2>
          <p className="text-slate-600 mb-4">
            Failed to initialize. Please check browser console.
          </p>
          <Button
            onClick={() => router.push("/portal")}
            className="bg-[#166FB5] hover:bg-[#166FB5]/90"
          >
            Return to Verification
          </Button>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────
  //  Render helpers
  // ────────────────────────────────────────────────────────────────

  const primaryMember = members.find((m) => m.isPrimary);
  const otherMembers = members.filter((m) => !m.isPrimary);

  /** Renders the full member form (used inside expandable cards) */
  const renderMemberForm = (member: ClientMember) => (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmitMember(member.id);
      }}
      className="space-y-4 pt-3"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Name */}
        <div className="md:col-span-2">
          <Label className="text-sm font-semibold text-slate-700 mb-1 block">
            Full Name <span className="text-[#B9273A]">*</span>
          </Label>
          <Input
            value={member.formData.name}
            onChange={(e) => handleChange(member.id, "name", e.target.value)}
            placeholder="Enter full name"
            disabled={
              member.isSubmitted || projectDetails?.status === "Completed"
            }
            className="bg-white border-slate-200 focus:border-[#166FB5] focus:ring-[#166FB5]/20 h-10 disabled:opacity-70"
          />
          {member.errors.name && (
            <p className="text-[#B9273A] text-xs mt-1">{member.errors.name}</p>
          )}
        </div>

        {/* Email */}
        <div className="md:col-span-2">
          <Label className="text-sm font-semibold text-slate-700 mb-1 block">
            Email Address <span className="text-[#B9273A]">*</span>
            {member.isPrimary && (
              <span className="ml-2 text-xs font-normal text-slate-400">
                (Verified)
              </span>
            )}
          </Label>
          <Input
            value={member.formData.email}
            onChange={(e) => handleChange(member.id, "email", e.target.value)}
            placeholder={
              member.isPrimary
                ? "Your verified email"
                : "Enter team member email"
            }
            disabled={
              member.isPrimary ||
              member.isSubmitted ||
              projectDetails?.status === "Completed"
            }
            className="bg-white border-slate-200 focus:border-[#166FB5] focus:ring-[#166FB5]/20 h-10 disabled:bg-slate-50 disabled:opacity-70"
          />
          {member.errors.email && (
            <p className="text-[#B9273A] text-xs mt-1">
              {member.errors.email}
            </p>
          )}
        </div>

        {/* Affiliation */}
        <div className="md:col-span-2">
          <Label className="text-sm font-semibold text-slate-700 mb-1 block">
            Affiliation (Department & Institution){" "}
            <span className="text-[#B9273A]">*</span>
          </Label>
          <Input
            value={member.formData.affiliation}
            onChange={(e) =>
              handleChange(member.id, "affiliation", e.target.value)
            }
            placeholder="e.g. Division of Biological Sciences - UPV CAS"
            disabled={
              member.isSubmitted || projectDetails?.status === "Completed"
            }
            className="bg-white border-slate-200 focus:border-[#166FB5] focus:ring-[#166FB5]/20 h-10 disabled:opacity-70"
          />
          {member.errors.affiliation && (
            <p className="text-[#B9273A] text-xs mt-1">
              {member.errors.affiliation}
            </p>
          )}
        </div>

        {/* Designation */}
        <div>
          <Label className="text-sm font-semibold text-slate-700 mb-1 block">
            Designation <span className="text-[#B9273A]">*</span>
          </Label>
          <Input
            value={member.formData.designation}
            onChange={(e) =>
              handleChange(member.id, "designation", e.target.value)
            }
            placeholder="e.g. Research Assistant, Professor"
            disabled={
              member.isSubmitted || projectDetails?.status === "Completed"
            }
            className="bg-white border-slate-200 focus:border-[#166FB5] focus:ring-[#166FB5]/20 h-10 disabled:opacity-70"
          />
          {member.errors.designation && (
            <p className="text-[#B9273A] text-xs mt-1">
              {member.errors.designation}
            </p>
          )}
        </div>

        {/* Sex */}
        <div>
          <Label className="text-sm font-semibold text-slate-700 mb-1 block">
            Assigned sex at birth <span className="text-[#B9273A]">*</span>
          </Label>
          <Select
            value={member.formData.sex}
            onValueChange={(val) => handleChange(member.id, "sex", val)}
            disabled={
              member.isSubmitted || projectDetails?.status === "Completed"
            }
          >
            <SelectTrigger className="bg-white border-slate-200 focus:border-[#166FB5] focus:ring-[#166FB5]/20 h-10 disabled:opacity-70">
              <SelectValue placeholder="Select sex" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="M">Male</SelectItem>
              <SelectItem value="F">Female</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Phone Number */}
        <div className="md:col-span-2">
          <Label className="text-sm font-semibold text-slate-700 mb-1 block">
            Mobile Number <span className="text-[#B9273A]">*</span>
          </Label>
          <Input
            value={member.formData.phoneNumber}
            onChange={(e) =>
              handleChange(member.id, "phoneNumber", e.target.value)
            }
            placeholder="e.g. 09091234567"
            disabled={
              member.isSubmitted || projectDetails?.status === "Completed"
            }
            className="bg-white border-slate-200 focus:border-[#166FB5] focus:ring-[#166FB5]/20 h-10 disabled:opacity-70"
          />
          {member.errors.phoneNumber && (
            <p className="text-[#B9273A] text-xs mt-1">
              {member.errors.phoneNumber}
            </p>
          )}
        </div>

        {/* Affiliation Address */}
        <div className="md:col-span-2">
          <Label className="text-sm font-semibold text-slate-700 mb-1 block">
            Affiliation Address <span className="text-[#B9273A]">*</span>
          </Label>
          <Textarea
            value={member.formData.affiliationAddress}
            onChange={(e) =>
              handleChange(member.id, "affiliationAddress", e.target.value)
            }
            placeholder="Enter complete address of your institution/organization"
            disabled={
              member.isSubmitted || projectDetails?.status === "Completed"
            }
            className="bg-white border-slate-200 focus:border-[#166FB5] focus:ring-[#166FB5]/20 min-h-[80px] resize-none disabled:opacity-70"
          />
          {member.errors.affiliationAddress && (
            <p className="text-[#B9273A] text-xs mt-1">
              {member.errors.affiliationAddress}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-3 border-t border-slate-100">
        <Button
          type="button"
          onClick={() => handleSaveDraft(member.id)}
          disabled={
            member.isSubmitted ||
            submitting ||
            projectDetails?.status === "Completed"
          }
          variant="outline"
          className="h-10 px-6 border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold disabled:opacity-50"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Draft
        </Button>
        <Button
          type="submit"
          disabled={
            member.isSubmitted ||
            submitting ||
            projectDetails?.status === "Completed"
          }
          className="h-10 px-6 bg-gradient-to-r from-[#166FB5] to-[#4038AF] hover:from-[#166FB5]/90 hover:to-[#4038AF]/90 text-white font-semibold shadow-md disabled:opacity-50"
        >
          {member.isSubmitted ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Saved
            </>
          ) : submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            `Save ${member.isPrimary ? "Your" : "Member"} Information`
          )}
        </Button>
      </div>
    </form>
  );

  /** Renders a single member card (expandable) */
  const renderMemberCard = (member: ClientMember) => {
    const status = getMemberStatus(member);
    const StatusIcon = status.icon;
    const isExpanded = expandedMembers.has(member.id);

    return (
      <Card
        key={member.id}
        className={cn(
          "border transition-all duration-200",
          isExpanded ? "shadow-md border-slate-200" : "hover:shadow-sm"
        )}
      >
        {/* Card Header – always visible */}
        <button
          type="button"
          onClick={() => toggleMemberExpand(member.id)}
          className="w-full flex items-center justify-between p-3 text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              className={cn(
                "p-1.5 rounded-lg flex-shrink-0",
                member.isPrimary
                  ? "bg-[#166FB5]/10"
                  : "bg-slate-100"
              )}
            >
              <User
                className={cn(
                  "h-3.5 w-3.5",
                  member.isPrimary ? "text-[#166FB5]" : "text-slate-500"
                )}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-slate-800 truncate">
                  {member.formData.name || (member.isPrimary ? "Primary Member" : "Unnamed Member")}
                </span>
                {member.isPrimary && (
                  <Badge className="bg-[#166FB5]/10 text-[#166FB5] border-[#166FB5]/20 text-[10px] h-5 px-1.5">
                    Primary
                  </Badge>
                )}
                {member.isDraft && (
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-orange-200 text-orange-600">
                    Draft
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                {member.cid && member.cid !== "pending" && (
                  <span className="text-[11px] font-mono text-[#166FB5]/70">
                    {member.cid}
                  </span>
                )}
                {member.formData.email && (
                  <span className="text-[11px] text-slate-400 truncate">
                    {member.formData.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            <Badge className={cn(status.color, "text-white border-0 text-[10px] h-5 px-2")}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
            <ChevronRight
              className={cn(
                "h-4 w-4 text-slate-400 transition-transform duration-200",
                isExpanded && "rotate-90"
              )}
            />
          </div>
        </button>

        {/* Card Body – expanded form */}
        {isExpanded && (
          <CardContent className="px-3 pb-3 pt-0 border-t border-slate-100">
            {/* Remove button for non-primary draft members */}
            {!member.isPrimary &&
              projectDetails?.status !== "Completed" &&
              !member.cid && (
                <div className="flex justify-end mb-1.5">
                  <Button
                    onClick={() => handleRemoveMember(member.id)}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 text-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Remove Member
                  </Button>
                </div>
              )}
            {renderMemberForm(member)}
          </CardContent>
        )}
      </Card>
    );
  };

  // ────────────────────────────────────────────────────────────────
  //  Sidebar content (shared between desktop & mobile)
  // ────────────────────────────────────────────────────────────────

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b bg-gradient-to-r from-[#166FB5] to-[#4038AF]">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-white font-bold text-lg">Client Portal</h2>
            <p className="text-white/60 text-xs truncate mt-0.5">
              {emailParam}
            </p>
          </div>
          {/* Close button – mobile only */}
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Projects toggle */}
      <button
        onClick={() => setShowProjectsList(!showProjectsList)}
        className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-[#166FB5]/10 rounded-lg">
            <FolderOpen className="h-4 w-4 text-[#166FB5]" />
          </div>
          <span className="font-semibold text-sm text-slate-800">Projects</span>
          <Badge
            variant="outline"
            className="text-[10px] h-5 px-1.5 bg-slate-50"
          >
            {projects.length}
          </Badge>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-slate-400 transition-transform duration-200",
            showProjectsList && "rotate-180"
          )}
        />
      </button>

      {/* New Project button (shown when Projects list is collapsed) */}
      {!showProjectsList && (
        <div className="p-3 border-b border-slate-100">
          <Button
            onClick={() => {
              handleCreateNewProject();
              setMobileSidebarOpen(false);
            }}
            disabled={!!(projectRequest && (projectRequest.status === "draft" || projectRequest.status === "pending"))}
            title={projectRequest && (projectRequest.status === "draft" || projectRequest.status === "pending") ? "Please complete or submit your current project before creating a new one" : ""}
            className="w-full bg-[#166FB5] hover:bg-[#166FB5]/90 text-white h-9 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>
      )}

      {/* Projects list */}
      {showProjectsList && (
        <div className="flex-1 overflow-y-auto">
          {projects.length === 0 ? (
            <div className="text-center py-10 px-4">
              <div className="p-3 bg-slate-100 rounded-full w-fit mx-auto mb-3">
                <FolderOpen className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500 font-medium">
                No projects yet
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Create your first project below
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {projects.map((project) => {
                const isSelected = selectedProjectPid === project.pid;
                return (
                  <button
                    key={project.pid}
                    onClick={() => {
                      handleSelectProject(project);
                      setMobileSidebarOpen(false);
                    }}
                    className={cn(
                      "w-full text-left p-3 rounded-lg transition-all duration-150",
                      isSelected
                        ? "bg-[#166FB5]/8 border-l-[3px] border-l-[#166FB5] shadow-sm"
                        : "hover:bg-slate-50 border-l-[3px] border-l-transparent"
                    )}
                  >
                    <p
                      className={cn(
                        "font-medium text-sm truncate",
                        isSelected ? "text-[#166FB5]" : "text-slate-700"
                      )}
                    >
                      {project.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-mono text-slate-400">
                        {project.pid}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] h-4 px-1.5 border",
                          statusColors[project.status] || "bg-slate-100 text-slate-600"
                        )}
                      >
                        {project.status}
                      </Badge>
                    </div>
                  </button>
                );
              })}
              
              {/* New Project button at the bottom of the list */}
              <div className="px-2 pt-2">
                <Button
                  onClick={() => {
                    handleCreateNewProject();
                    setMobileSidebarOpen(false);
                  }}
                  disabled={!!(projectRequest && (projectRequest.status === "draft" || projectRequest.status === "pending"))}
                  title={projectRequest && (projectRequest.status === "draft" || projectRequest.status === "pending") ? "Please complete or submit your current project before creating a new one" : ""}
                  className="w-full bg-[#166FB5] hover:bg-[#166FB5]/90 text-white h-9 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer actions */}
      <div className="p-3 border-t border-slate-100">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/portal")}
          className="w-full justify-start text-slate-500 hover:text-slate-700 h-9 text-sm"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Exit Portal
        </Button>
      </div>
    </div>
  );

  // ────────────────────────────────────────────────────────────────
  //  Main render
  // ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Mobile header bar */}
      <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="min-w-0">
          <h1 className="font-bold text-slate-800 text-sm truncate">
            {projectDetails?.title || "Client Portal"}
          </h1>
          {projectDetails?.pid && (
            <p className="text-[11px] text-slate-500 font-mono">
              {projectDetails.pid}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMobileSidebarOpen(true)}
          className="text-slate-600"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex h-[calc(100vh-73px)] lg:h-full">
        {/* ═════ LEFT SIDEBAR — Desktop ═════ */}
        <aside className="hidden lg:flex w-[320px] min-w-[280px] bg-white border-r border-slate-200 flex-shrink-0 flex-col">
          {sidebarContent}
        </aside>

        {/* ═════ LEFT SIDEBAR — Mobile overlay ═════ */}
        {mobileSidebarOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/40 z-40 lg:hidden"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <aside className="fixed left-0 top-0 bottom-0 w-[320px] bg-white z-50 lg:hidden shadow-2xl flex flex-col">
              {sidebarContent}
            </aside>
          </>
        )}

        {/* ═════ RIGHT CONTENT ═════ */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50/50 to-blue-50/30">
          {projectDetails ? (
            <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
              {/* ── Project Header ────────────────────────── */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <h1 className="text-2xl font-bold text-slate-800">
                      {projectDetails.title}
                    </h1>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className="font-mono text-xs bg-blue-50 text-[#166FB5] border-blue-200 px-2"
                    >
                      {projectDetails.pid}
                    </Badge>
                    <Badge
                      className={cn(
                        "border text-xs",
                        statusColors[projectDetails.status] ||
                          "bg-slate-100 text-slate-600"
                      )}
                    >
                      {projectDetails.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* ── Project Details Grid ──────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Card className="border border-slate-100 shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-3.5 w-3.5 text-[#166FB5]" />
                      <span className="text-xs text-slate-500 font-medium">
                        Project Lead
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {projectDetails.lead}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border border-slate-100 shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="h-3.5 w-3.5 text-purple-600" />
                      <span className="text-xs text-slate-500 font-medium">
                        Start Date
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">
                      {formatDate(projectDetails.startDate)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border border-slate-100 shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="h-3.5 w-3.5 text-orange-600" />
                      <span className="text-xs text-slate-500 font-medium">
                        Sending Institution
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {projectDetails.sendingInstitution}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border border-slate-100 shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="h-3.5 w-3.5 text-green-600" />
                      <span className="text-xs text-slate-500 font-medium">
                        Funding Institution
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {projectDetails.fundingInstitution}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* ── Team Members Section ──────────────────── */}
              <div className="space-y-4">
                {/* Section header */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-[#166FB5]/10 rounded-lg">
                      <Users className="h-4 w-4 text-[#166FB5]" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-800 leading-tight">
                        Team Members
                      </h2>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                        <strong>
                          {members.filter((m) => m.isSubmitted).length}
                        </strong>{" "}
                        / <strong>{members.length}</strong> Saved
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Add Member button (for all projects) */}
                    <Button
                      onClick={handleAddMember}
                      variant="outline"
                      size="sm"
                      disabled={projectDetails?.status === "Completed" || approvalStatus === "pending"}
                      className="border-[#166FB5] text-[#166FB5] hover:bg-[#166FB5] hover:text-white disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      New Member
                    </Button>
                  </div>
                </div>

                {/* Draft/Pending project info banner */}
                {projectDetails?.isDraft && (
                  <div className={`rounded-lg p-4 border ${
                    projectDetails.status === "Draft" 
                      ? "bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200"
                      : projectDetails.status === "Pending Approval"
                      ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"
                      : "bg-gradient-to-r from-red-50 to-pink-50 border-red-200"
                  }`}>
                    <div className="flex items-start gap-3">
                      {projectDetails.status === "Pending Approval" ? (
                        <Clock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      ) : projectDetails.status === "Rejected" ? (
                        <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 space-y-2">
                        {projectDetails.status === "Draft" ? (
                          <>
                            <p className="text-sm font-semibold text-orange-900">
                              Draft Project — Pending Submission
                            </p>
                            <p className="text-xs text-orange-700 leading-relaxed">
                              Please fill out your information as the <strong>Primary Member</strong>, then scroll down and click "<strong>Submit Project and Member/s for Approval</strong>" to send this project to the admin for review. Once approved, you'll receive a PID and CID.
                            </p>
                          </>
                        ) : projectDetails.status === "Pending Approval" ? (
                          <>
                            <p className="text-sm font-semibold text-blue-900">
                              Pending Admin Approval
                            </p>
                            <p className="text-xs text-blue-700 leading-relaxed">
                              Your project and team members have been submitted and are currently under review by the administrator. You'll receive a notification once approved. <strong>No further action needed at this time.</strong>
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-semibold text-red-900">
                              Project Rejected
                            </p>
                            <p className="text-xs text-red-700 leading-relaxed">
                              Your project submission was not approved. Please review the admin's feedback and make necessary corrections before resubmitting.
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Primary member */}
                {primaryMember && (
                  <div className="space-y-1.5">
                    <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1">
                      Primary Member
                    </h3>
                    {renderMemberCard(primaryMember)}
                  </div>
                )}

                {/* Other members */}
                {otherMembers.length > 0 && (
                  <div className="space-y-1.5">
                    <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1">
                      Other Members ({otherMembers.length})
                    </h3>
                    <div className="space-y-1.5">
                      {otherMembers.map((member) =>
                        renderMemberCard(member)
                      )}
                    </div>
                  </div>
                )}

                {/* ── Approval Banners ────────────────────── */}
                {showApprovalCelebration &&
                  approvalStatus === "approved" && (
                    <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border-2 border-green-300 rounded-xl p-6 shadow-lg animate-in slide-in-from-top duration-500">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg animate-bounce">
                          <PartyPopper className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-bold text-xl text-green-800">
                              🎉 Team Members Approved!
                            </h4>
                            <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
                          </div>
                          <p className="text-green-700 mb-3 leading-relaxed">
                            Your team members have been reviewed and approved by{" "}
                            <strong>
                              {approvalStatusData.reviewedByName ||
                                "the administrator"}
                            </strong>
                            . All members are registered with unique Client IDs.
                          </p>
                          {approvalStatusData.reviewNotes && (
                            <div className="bg-white/70 rounded-lg p-3 mt-2 border border-green-200">
                              <p className="text-sm font-semibold text-green-800 mb-1">
                                Admin Notes:
                              </p>
                              <p className="text-sm text-green-700 italic">
                                {approvalStatusData.reviewNotes}
                              </p>
                            </div>
                          )}
                          <div className="mt-4 flex items-center gap-3">
                            <Badge className="bg-green-600 text-white border-0 text-xs px-3 py-1">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              All Members Registered
                            </Badge>
                            <Badge className="bg-blue-600 text-white border-0 text-xs px-3 py-1">
                              Project Status: Ongoing
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowApprovalCelebration(false)}
                          className="text-green-600 hover:text-green-800 hover:bg-green-100"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                {approvalStatus === "pending" && (
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Clock className="h-5 w-5 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-orange-800">
                          Pending Admin Approval
                        </h4>
                        <p className="text-sm text-orange-700 mt-1">
                          Your team members have been submitted for review. You
                          will be notified once a decision is made.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {approvalStatus === "rejected" && (
                  <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <XCircle className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-red-800">
                          Submission Rejected
                        </h4>
                        <p className="text-sm text-red-700 mt-1">
                          Please review and update the member information, then
                          resubmit.
                        </p>
                        {approvalStatusData.reviewNotes && (
                          <div className="bg-white/70 rounded-lg p-3 mt-2 border border-red-200">
                            <p className="text-sm font-semibold text-red-800 mb-1">
                              Reason for Rejection:
                            </p>
                            <p className="text-sm text-red-700">
                              {approvalStatusData.reviewNotes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {approvalStatus === "approved" &&
                  !showApprovalCelebration &&
                  !members.some((m) => m.isDraft) &&
                  members.filter((m) => !m.isPrimary).length > 0 && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <ShieldCheck className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-green-800">
                            Team Approved
                          </h4>
                          <p className="text-sm text-green-700 mt-1">
                            All team members have been approved and registered
                            with their Client IDs.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                {/* ── Submit for Approval Button ─────────── */}
                {projectDetails?.status !== "Completed" &&
                  approvalStatus !== "pending" &&
                  approvalStatus !== "approved" && (
                    <div className="pt-6 border-t-2 border-slate-200">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="text-sm text-slate-500">
                          {members.some((m) => !m.isSubmitted) ? (
                            <span className="text-[#B9273A] font-semibold flex items-center gap-1.5">
                              <AlertCircle className="h-4 w-4" />
                              Please save all member information before submitting
                            </span>
                          ) : projectDetails?.isDraft ? (
                            <span className="flex items-center gap-1.5 text-blue-600 font-medium">
                              <CheckCircle2 className="h-4 w-4" />
                              Project and member info ready for submission
                            </span>
                          ) : (
                            "Submit your team members for admin review"
                          )}
                        </div>
                        <Button
                          onClick={handleFinalSubmit}
                          disabled={submitting || members.some((m) => !m.isSubmitted)}
                          className="h-12 px-8 bg-gradient-to-r from-[#166FB5] to-[#4038AF] hover:from-[#166FB5]/90 hover:to-[#4038AF]/90 text-white font-bold shadow-xl hover:shadow-2xl disabled:opacity-50 whitespace-nowrap"
                        >
                          <Send className="h-5 w-5 mr-2" />
                          Submit Project and Member/s for Approval
                        </Button>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          ) : (
            /* ── Empty state (no project selected) ─────── */
            <div className="h-full flex items-center justify-center p-6">
              <div className="text-center max-w-md">
                <div className="p-4 bg-slate-100 rounded-full w-fit mx-auto mb-4">
                  <FolderOpen className="h-12 w-12 text-slate-400" />
                </div>
                <h2 className="text-xl font-bold text-slate-700 mb-2">
                  {projects.length === 0
                    ? "No Projects Yet"
                    : "Select a Project"}
                </h2>
                <p className="text-slate-500 mb-6">
                  {projects.length === 0
                    ? "Get started by creating your first project."
                    : "Choose a project from the sidebar to view details and manage team members."}
                </p>
                {projects.length === 0 && (
                  <Button
                    onClick={handleCreateNewProject}
                    className="bg-[#166FB5] hover:bg-[#166FB5]/90"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Project
                  </Button>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ═════ MODALS ═════ */}

      {/* Confirm save modal */}
      <ConfirmationModalLayout
        open={showConfirmModal}
        onConfirm={handleConfirmSave}
        onCancel={() => {
          setShowConfirmModal(false);
          setPendingMemberId(null);
        }}
        loading={submitting}
        title="Confirm Member Information"
        description="Please review the information below before saving."
        confirmLabel="Save Member"
        cancelLabel="Go Back"
      >
        {pendingMemberId &&
          (() => {
            const member = members.find((m) => m.id === pendingMemberId);
            if (!member) return null;
            return (
              <div className="space-y-2 text-slate-800 text-sm">
                <div>
                  <span className="font-semibold">Full Name:</span>{" "}
                  {member.formData.name}
                </div>
                <div>
                  <span className="font-semibold">Email:</span>{" "}
                  {member.formData.email}
                </div>
                <div>
                  <span className="font-semibold">Affiliation:</span>{" "}
                  {member.formData.affiliation}
                </div>
                <div>
                  <span className="font-semibold">Designation:</span>{" "}
                  {member.formData.designation}
                </div>
                <div>
                  <span className="font-semibold">Sex:</span>{" "}
                  {member.formData.sex}
                </div>
                <div>
                  <span className="font-semibold">Mobile Number:</span>{" "}
                  {member.formData.phoneNumber}
                </div>
                <div>
                  <span className="font-semibold">Affiliation Address:</span>{" "}
                  {member.formData.affiliationAddress}
                </div>
              </div>
            );
          })()}
      </ConfirmationModalLayout>

      {/* Delete confirmation modal */}
      <ConfirmationModalLayout
        open={showDeleteModal}
        onConfirm={confirmRemoveMember}
        onCancel={() => {
          setShowDeleteModal(false);
          setMemberToDelete(null);
        }}
        loading={false}
        title="Remove Member?"
        description="Are you sure you want to remove this member?"
        confirmLabel="Remove"
        cancelLabel="Cancel"
      >
        <p className="text-sm text-slate-600">
          Note: This will remove them from the current session. If previously
          saved, their record will remain in the database.
        </p>
      </ConfirmationModalLayout>

      {/* Submit for approval confirmation modal */}
      <ConfirmationModalLayout
        open={showSubmitForApprovalModal}
        onConfirm={handleConfirmSubmitForApproval}
        onCancel={() => setShowSubmitForApprovalModal(false)}
        loading={submitting}
        title="Submit Project and Member/s for Approval"
        description="Once submitted, an administrator will review the project subject and all team members before they are officially registered."
        confirmLabel="Submit for Approval"
        cancelLabel="Go Back"
      >
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 font-medium mb-2">
              {members.filter((m) => m.isDraft && !m.isPrimary).length}{" "}
              member(s) will be submitted for review:
            </p>
            <ul className="space-y-1">
              {members
                .filter((m) => m.isDraft && !m.isPrimary)
                .map((m) => (
                  <li
                    key={m.id}
                    className="text-sm text-blue-700 flex items-center gap-2"
                  >
                    <User className="h-3 w-3" />
                    {m.formData.name || "Unnamed"} — {m.formData.email}
                  </li>
                ))}
            </ul>
          </div>
          <p className="text-xs text-slate-500">
            You will be notified once the administrator has reviewed your
            submission. No CIDs will be generated until approval.
          </p>
        </div>
      </ConfirmationModalLayout>

      {/* Submit project for approval confirmation modal */}
      <ConfirmationModalLayout
        open={showSubmitProjectModal}
        onConfirm={handleConfirmSubmitProject}
        onCancel={() => setShowSubmitProjectModal(false)}
        loading={submitting}
        title="Submit Project for Approval"
        description="Submit your project and primary member information for administrator review. Once approved, you'll receive your official PID and CID."
        confirmLabel="Submit to Admin"
        cancelLabel="Go Back"
      >
        <div className="space-y-3">
          {projectRequest && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <p className="text-sm font-semibold text-blue-900 mb-2">
                Project Details:
              </p>
              <div className="space-y-1 text-xs text-blue-800">
                <div><strong>Title:</strong> {projectRequest.title}</div>
                <div><strong>Lead:</strong> {projectRequest.projectLead}</div>
                <div><strong>Sending Institution:</strong> {projectRequest.sendingInstitution}</div>
                <div><strong>Funding Institution:</strong> {projectRequest.fundingInstitution}</div>
              </div>
            </div>
          )}
          {primaryMember && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 space-y-2">
              <p className="text-sm font-semibold text-green-900 mb-2">
                Primary Member:
              </p>
              <div className="space-y-1 text-xs text-green-800">
                <div><strong>Name:</strong> {primaryMember.formData.name}</div>
                <div><strong>Email:</strong> {primaryMember.formData.email}</div>
                <div><strong>Affiliation:</strong> {primaryMember.formData.affiliation}</div>
              </div>
            </div>
          )}
          <p className="text-xs text-slate-500 italic">
            You can add additional team members after your project is approved.
          </p>
        </div>
      </ConfirmationModalLayout>
    </>
  );
}
