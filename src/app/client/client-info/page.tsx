"use client";

// Client Portal — Two-Panel Layout
// Left pane (1/4): Projects navigation sidebar
// Right pane (3/4): Selected project details + team member management

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import {
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  deleteDoc,
  Timestamp,
  or,
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
  getProjectRequestById,
  getProjectRequestsByInquiry,
  saveProjectRequest,
  submitProjectForApproval,
  subscribeToProjectRequest,
  subscribeToProjectRequestsByInquiry,
  ProjectRequest,
} from "@/services/projectRequestService";
import {
  saveClientRequest,
  getClientRequestsByInquiry,
  submitClientRequestsForApproval,
  subscribeToClientRequests,
  ClientRequest,
} from "@/services/clientRequestService";
import { getQuotationsByInquiryId } from "@/services/quotationService";
import { getChargeSlipsByProjectId } from "@/services/chargeSlipService";
import { QuotationRecord } from "@/types/Quotation";
import { ChargeSlipRecord } from "@/types/ChargeSlipRecord";
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
  FileText,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ClientConformeModal from "@/components/forms/ClientConformeModal";

// ────────────────────────────────────────────────────────────────
//  Types
// ────────────────────────────────────────────────────────────────

interface ClientMember {
  id: string;
  cid: string;
  formData: ClientFormData;
  initialData?: ClientFormData;
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
  const { user, loading: authLoading } = useAuth();

  const emailParam = searchParams.get("email");
  const inquiryIdParam = searchParams.get("inquiryId");
  const pidParam = searchParams.get("pid");
  const projectRequestIdParam = searchParams.get("projectRequestId");

  // ── UI state ──────────────────────────────────────────────────
  const [showProjectsList, setShowProjectsList] = useState(true);
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(
    new Set(["primary"])
  );
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [expandedProjectDocs, setExpandedProjectDocs] = useState<Set<string>>(new Set());
  const [projectDocuments, setProjectDocuments] = useState<
    Map<string, { quotations: QuotationRecord[]; chargeSlips: ChargeSlipRecord[]; loading: boolean }>
  >(new Map());

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
  const [currentProjectRequestId, setCurrentProjectRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ── Modal state ───────────────────────────────────────────────
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  
  // Real-time data containers
  const [fetchedDraftProjects, setFetchedDraftProjects] = useState<ProjectDetails[]>([]);
  const [fetchedApprovedProjects, setFetchedApprovedProjects] = useState<ProjectDetails[]>([]);
  
  const [fetchedClientRequests, setFetchedClientRequests] = useState<ClientRequest[]>([]);
  const [fetchedClients, setFetchedClients] = useState<any[]>([]); // Using any for raw client doc data for now
  const [fetchedMemberApprovals, setFetchedMemberApprovals] = useState<any[]>([]);
  
  const [showSubmitForApprovalModal, setShowSubmitForApprovalModal] =
    useState(false);
  const [showSubmitProjectModal, setShowSubmitProjectModal] = useState(false);

  // Client Conforme modal — shown before final submission
  const [showConformeModal, setShowConformeModal] = useState(false);
  const [conformePendingAction, setConformePendingAction] = useState<
    "draft" | "team" | null
  >(null);

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
  //  Authentication Check
  // ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!authLoading && !user) {
      console.log("🚫 No authenticated user, redirecting to login");
      router.replace("/login");
      return;
    }
  }, [user, authLoading, router]);

  // ────────────────────────────────────────────────────────────────
  //  Data Subscriptions
  // ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!emailParam || !inquiryIdParam) {
      router.replace("/portal");
      return;
    }

    // Wait for authentication before loading data
    if (authLoading || !user) {
      return;
    }

    // Initialize projectRequestId from URL if provided
    if (projectRequestIdParam) {
      setCurrentProjectRequestId(projectRequestIdParam);
    }

    // 1. Subscribe to Draft/Pending Project Requests
    const unsubDraftProjects = subscribeToProjectRequestsByInquiry(inquiryIdParam, (requests) => {
      // Filter for draft/pending/rejected
      const drafts = requests
        .filter(r => ["draft", "pending", "rejected"].includes(r.status))
        .map((draftProjectRequest) => {
           console.log(`Found ${draftProjectRequest.status} project request: ${draftProjectRequest.id}`);
           const statusLabel = draftProjectRequest.status === "draft" ? "Draft" : 
                            draftProjectRequest.status === "pending" ? "Pending Approval" :
                            "Rejected";
           return {
            pid: draftProjectRequest.id || inquiryIdParam, // Always use inquiryId for consistency in drafts
            title: draftProjectRequest.title || "Draft Project",
            lead: draftProjectRequest.projectLead || "Not specified",
            startDate: draftProjectRequest.startDate?.toDate?.() || new Date(),
            sendingInstitution: draftProjectRequest.sendingInstitution || "Not specified",
            fundingInstitution: draftProjectRequest.fundingInstitution || "Not specified",
            status: statusLabel,
            inquiryId: inquiryIdParam,
            isDraft: true,
            // Store original request ID for selection matching
            originalRequestId: draftProjectRequest.id
           } as ProjectDetails;
        });
      setFetchedDraftProjects(drafts);
      
      // Update selected project request object if needed
      if (currentProjectRequestId) {
        const match = requests.find(r => r.id === currentProjectRequestId);
        if (match) setProjectRequest(match);
      } else if (requests.length > 0) {
        // Default to first usually
        setProjectRequest(requests[0]);
      }
    });

    // 2. Subscribe to Approved Projects
    const projectsQ = query(
      collection(db, "projects"), 
      or(
        where("iid", "==", inquiryIdParam),
        where("iid", "array-contains", inquiryIdParam)
      )
    );
    const unsubApprovedProjects = onSnapshot(projectsQ, (snapshot) => {
      const approved = snapshot.docs.map((projectDoc) => {
        const projectData = projectDoc.data();
        return {
          pid: projectData.pid || projectDoc.id,
          title: projectData.title || "Untitled Project",
          lead: projectData.lead || "Not specified",
          startDate: projectData.startDate?.toDate?.() || projectData.startDate || new Date(),
          sendingInstitution: projectData.sendingInstitution || "Not specified",
          fundingInstitution: projectData.fundingInstitution || "Not specified",
          status: projectData.status || "Pending",
          inquiryId: projectData.iid || inquiryIdParam || "",
        } as ProjectDetails;
      });
      setFetchedApprovedProjects(approved);
    });

    // 3. Subscribe to Client Requests (Draft Members)
    const unsubClientRequests = subscribeToClientRequests(inquiryIdParam, (requests) => {
      setFetchedClientRequests(requests);
    });

    // 4. Subscribe to Clients (Approved Members)
    const clientsQ = query(collection(db, "clients"), where("inquiryId", "==", inquiryIdParam));
    const unsubClients = onSnapshot(clientsQ, (snapshot) => {
        const clients = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
        setFetchedClients(clients);
        setLoading(false); // Assume data is loaded once clients return (or empty)
    });

    return () => {
      unsubDraftProjects();
      unsubApprovedProjects();
      unsubClientRequests();
      unsubClients();
    };
  }, [emailParam, inquiryIdParam, projectRequestIdParam, router, authLoading, user]);

  // 1.5. Subscribe to Member Approvals for the selected project
  useEffect(() => {
    if (!inquiryIdParam || !selectedProjectPid || selectedProjectPid.startsWith("inquiry-") || projectDetails?.isDraft) {
      setFetchedMemberApprovals([]);
      return;
    }

    const docId = `${inquiryIdParam}_${selectedProjectPid}`;
    const unsub = onSnapshot(doc(db, "memberApprovals", docId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setFetchedMemberApprovals(data.members || []);
        
        // Also sync approval status while we are at it
        if (data.status) {
            setApprovalStatus(data.status);
        }
      } else {
        setFetchedMemberApprovals([]);
      }
    }, (error) => {
      console.error("Error listening to member approvals:", error);
    });

    return () => unsub();
  }, [inquiryIdParam, selectedProjectPid, projectDetails?.isDraft]);

  // ────────────────────────────────────────────────────────────────
  //  Data merging & processing
  // ────────────────────────────────────────────────────────────────
  
  useEffect(() => {
    // Combine projects
    const allProjects = [...fetchedDraftProjects, ...fetchedApprovedProjects];
    setProjects(allProjects);

    // Determine currently selected project details
    let selectedDetails: ProjectDetails | null = null;
    
    // 1. Priority to existing state selection (from sidebar click)
    if (selectedProjectPid) {
       selectedDetails = allProjects.find(p => p.pid === selectedProjectPid) || null;
    }
    
    // 2. Next Priority to PID from URL Param
    if (!selectedDetails && pidParam) {
       selectedDetails = allProjects.find(p => p.pid === pidParam) || null;
    }
    
    // 3. Next Priority to Current Project Request ID
    if (!selectedDetails && currentProjectRequestId) {
       selectedDetails = allProjects.find(p => (p as any).originalRequestId === currentProjectRequestId || p.pid === currentProjectRequestId) || null;
    } 

    if (!selectedDetails && allProjects.length > 0) {
      // Default to first if nothing selected
      selectedDetails = allProjects[0];
    }
    
    if (selectedDetails) {
        // Sync project details but avoid infinite loops with deep comparison checks
        if (!projectDetails || projectDetails.pid !== selectedDetails.pid || projectDetails.status !== selectedDetails.status) {
           setProjectDetails(selectedDetails);
        }
        
        if (selectedProjectPid !== selectedDetails.pid) {
           setSelectedProjectPid(selectedDetails.pid);
        }
    }

    // Process Members
    // 0. Get set of approved emails for filtering duplicates
    const approvedEmails = new Set(fetchedClients.map((c: any) => c.email?.toLowerCase()).filter(Boolean));

    // 1. Find Primary Member
    let primaryMember: ClientMember | null = null;
    
    // Check approved clients FIRST for primary
    const primaryClientDoc = fetchedClients.find((c: any) => {
        const email = c.email?.toLowerCase();
        if (email !== emailParam?.toLowerCase()) return false;
        
        // If we have a selected project, prioritize the doc linked to that project
        if (selectedDetails) {
            const memberPids = Array.isArray(c.pid) ? c.pid : (c.pid ? [c.pid] : []);
            return memberPids.includes(selectedDetails.pid);
        }
        return true;
    });
    
    if (primaryClientDoc) {
         primaryMember = {
            id: "primary",
            cid: primaryClientDoc.id,
            formData: {
              name: primaryClientDoc.name || "",
              email: primaryClientDoc.email || emailParam || "",
              affiliation: primaryClientDoc.affiliation || "",
              designation: primaryClientDoc.designation || "",
              sex: (primaryClientDoc.sex || "M") as any,
              phoneNumber: primaryClientDoc.phoneNumber || "",
              affiliationAddress: primaryClientDoc.affiliationAddress || "",
            },
            initialData: {
              name: primaryClientDoc.name || "",
              email: primaryClientDoc.email || emailParam || "",
              affiliation: primaryClientDoc.affiliation || "",
              designation: primaryClientDoc.designation || "",
              sex: (primaryClientDoc.sex || "M") as any,
              phoneNumber: primaryClientDoc.phoneNumber || "",
              affiliationAddress: primaryClientDoc.affiliationAddress || "",
            },
            errors: {},
            isSubmitted: !!primaryClientDoc.haveSubmitted,
            isPrimary: true,
        };
    } else {
        // Only if not found in approved, check drafts
        const primaryDraftRequest = fetchedClientRequests.find(r => r.email.toLowerCase() === emailParam?.toLowerCase());
        
        if (primaryDraftRequest) {
            primaryMember = {
                id: "primary",
                cid: "draft",
                formData: {
                  name: primaryDraftRequest.name || "",
                  email: primaryDraftRequest.email || emailParam || "",
                  affiliation: primaryDraftRequest.affiliation || "",
                  designation: primaryDraftRequest.designation || "",
                  sex: (primaryDraftRequest.sex || "M") as any,
                  phoneNumber: primaryDraftRequest.phoneNumber || "",
                  affiliationAddress: primaryDraftRequest.affiliationAddress || "",
                },
                initialData: {
                  name: primaryDraftRequest.name || "",
                  email: primaryDraftRequest.email || emailParam || "",
                  affiliation: primaryDraftRequest.affiliation || "",
                  designation: primaryDraftRequest.designation || "",
                  sex: (primaryDraftRequest.sex || "M") as any,
                  phoneNumber: primaryDraftRequest.phoneNumber || "",
                  affiliationAddress: primaryDraftRequest.affiliationAddress || "",
                },
                errors: {},
                isSubmitted: !!primaryDraftRequest.isValidated,
                isPrimary: true,
                isDraft: true,
            };
        }
    }

    if (!primaryMember && emailParam) {
         primaryMember = {
            id: "primary",
            cid: "pending",
            formData: {
              name: "",
              email: emailParam,
              affiliation: "",
              designation: "",
              sex: "M", // Default to M for primary member instead of empty to satisfy validation initially
              phoneNumber: "",
              affiliationAddress: "",
            },
            initialData: {
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

    // 2. Process Additional Members
    // 2a. Draft members from ClientRequests (usually for draft projects)
    const additionalDraftMembers: ClientMember[] = fetchedClientRequests
        .filter(r => {
            const email = r.email?.toLowerCase();
            const name = r.name?.trim();
            
            // Skip if completely empty and not just added
            if (!email && !name) return false;

            return email !== emailParam?.toLowerCase() && 
                   (!email || !approvedEmails.has(email)) &&
                   (r.status === "draft" || r.status === "pending" || r.status === "rejected");
        })
        .map((r, index) => ({
            id: r.id || `draft-member-${index + 1}`,
            cid: "draft",
            formData: {
              name: r.name || "",
              email: r.email?.includes("@temp.pgc") ? "" : r.email || "",
              affiliation: r.affiliation || "",
              designation: r.designation || "",
              sex: (r.sex || "") as any,
              phoneNumber: r.phoneNumber || "",
              affiliationAddress: r.affiliationAddress || "",
            },
            initialData: {
              name: r.name || "",
              email: r.email?.includes("@temp.pgc") ? "" : r.email || "",
              affiliation: r.affiliation || "",
              designation: r.designation || "",
              sex: (r.sex || "") as any,
              phoneNumber: r.phoneNumber || "",
              affiliationAddress: r.affiliationAddress || "",
            },
            errors: {},
            isSubmitted: !!r.isValidated,
            isPrimary: false,
            isDraft: true,
        }));

    // 2b. Pending members from MemberApprovals (for existing projects)
    const pendingProjectMembers: ClientMember[] = fetchedMemberApprovals
        .filter(m => {
            if (m.isPrimary) return false;
            // Also filter out if already approved
            const email = m.formData?.email?.toLowerCase();
            return email && !approvedEmails.has(email);
        })
        .map((m, index) => ({
            id: m.tempId || `pending-member-${index + 1}`,
            cid: "pending",
            formData: m.formData || {
              name: "",
              email: "",
              affiliation: "",
              designation: "",
              sex: "" as any,
              phoneNumber: "",
              affiliationAddress: "",
            },
            initialData: { ...(m.formData || {}) },
            errors: {},
            isSubmitted: !!m.isValidated,
            isPrimary: false,
            isDraft: true,
        }));

    // 2c. Approved members from Clients collection
    const approvedMembers: ClientMember[] = fetchedClients
        .filter((c: any) => {
            if (!c.email || c.email.toLowerCase() === emailParam?.toLowerCase()) return false;
            
            // Only show members belonging to the currently selected project
            if (selectedDetails) {
                const memberPids = Array.isArray(c.pid) ? c.pid : (c.pid ? [c.pid] : []);
                return memberPids.includes(selectedDetails.pid);
            }
            return true;
        })
        .map((data: any, index) => ({
             id: data.id || `member-${index + 1}`,
             cid: data.id,
             formData: {
                  name: data.name || "",
                  email: data.email || "",
                  affiliation: data.affiliation || "",
                  designation: data.designation || "",
                  sex: data.sex || "" as any,
                  phoneNumber: data.phoneNumber || "",
                  affiliationAddress: data.affiliationAddress || "",
             },
             initialData: {
                  name: data.name || "",
                  email: data.email || "",
                  affiliation: data.affiliation || "",
                  designation: data.designation || "",
                  sex: data.sex || "" as any,
                  phoneNumber: data.phoneNumber || "",
                  affiliationAddress: data.affiliationAddress || "",
             },
             errors: {},
             isSubmitted: !!data.haveSubmitted,
             isPrimary: false,
             isDraft: false,
        }));
        
    const allMembers = [primaryMember, ...additionalDraftMembers, ...pendingProjectMembers, ...approvedMembers].filter((m): m is ClientMember => m !== null);
    setMembers(allMembers);
    setExpandedMembers(prev => {
        const newSet = new Set(prev);
        if (primaryMember) newSet.add("primary");
        return newSet;
    });

  }, [
    fetchedDraftProjects, 
    fetchedApprovedProjects, 
    fetchedClientRequests, 
    fetchedClients, 
    fetchedMemberApprovals, 
    emailParam, 
    currentProjectRequestId, 
    pidParam,
    selectedProjectPid
  ]);


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

  const handleAddMember = async () => {
    if (!selectedProjectPid || !inquiryIdParam) {
      toast.error("Please select a project first");
      return;
    }
    if (approvalStatus === "pending") {
      toast.error("Cannot add members while approval is pending");
      return;
    }

    // Check for any unsaved member (Primary must be submitted, Team Drafts must be saved)
    const unsavedMember = members.find(
      (m) =>
        (m.isPrimary && !m.isSubmitted) ||
        (!m.isPrimary && m.isDraft && (m.id.startsWith("draft-") || !m.formData.name || !m.formData.email))
    );

    if (unsavedMember) {
      toast.error(
        unsavedMember.isPrimary
          ? "Please save your information as Primary Member first before adding new team members."
          : "Please fill up and click save for the member you just added before adding a new one."
      );
      setExpandedMembers((prev) => new Set([...prev, unsavedMember.id]));
      return;
    }

    const uniqueDraftId = `draft-${Date.now()}`;
    const dummyEmail = `${uniqueDraftId}@temp.pgc`;

    const newMemberData = {
      inquiryId: inquiryIdParam,
      requestedBy: emailParam || "",
      requestedByName: members.find((m) => m.isPrimary)?.formData.name || "",
      name: "",
      email: dummyEmail,
      affiliation: "",
      designation: "",
      sex: "" as any,
      phoneNumber: "",
      affiliationAddress: "",
      isPrimary: false,
      isValidated: false,
      status: "draft" as const,
      ...(currentProjectRequestId && { projectRequestId: currentProjectRequestId }),
    };

    try {
      const savedDocId = await saveClientRequest(newMemberData);
      
      const newMember: ClientMember = {
        id: savedDocId,
        cid: "",
        formData: {
          name: "",
          email: "", // UI is empty
          affiliation: "",
          designation: "",
          sex: "" as any,
          phoneNumber: "",
          affiliationAddress: "",
        },
        initialData: {
          name: "",
          email: "",
          affiliation: "",
          designation: "",
          sex: "" as any,
          phoneNumber: "",
          affiliationAddress: "",
        },
        errors: {},
        isSubmitted: false,
        isPrimary: false,
        isDraft: true,
      };

      // Add new member after primary, or at the start if no primary found
      setMembers((prev) => {
        const primaryIdx = prev.findIndex(m => m.isPrimary);
        if (primaryIdx !== -1) {
          const newMembers = [...prev];
          newMembers.splice(primaryIdx + 1, 0, newMember);
          return newMembers;
        }
        return [newMember, ...prev];
      });

      setExpandedMembers((prev) => new Set([...prev, savedDocId]));
      toast.success("New member slot added. Please fill in their details.");
    } catch (error) {
      console.error("Error adding draft member:", error);
      toast.error("Failed to add new member draft");
    }
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

      // If it's a draft member, also try to delete from clientRequests collection
      if (member.isDraft && member.id && !member.id.startsWith("draft-") && !member.id.startsWith("request-")) {
        await deleteDoc(doc(db, "clientRequests", member.id));
        console.log("Deleted draft member from clientRequests:", member.id);
      }

      const updatedMembers = members.filter((m) => m.id !== memberToDelete);
      setMembers(updatedMembers);

      // Update memberApprovals if draft member removed
      if (member.isDraft && selectedProjectPid && inquiryIdParam && selectedProjectPid !== "DRAFT") {
        const remainingDrafts = updatedMembers.filter(
          (m) => m.isDraft && !m.isPrimary
        );
        
        const approvalId = `${inquiryIdParam}_${selectedProjectPid}`;
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
        } else {
          // If no more drafts for this specific project's approval request, delete the approval record
          await deleteDoc(doc(db, "memberApprovals", approvalId));
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
          ? {
              ...member,
              formData: { ...member.formData, [field]: value },
              isSubmitted: false,
              errors: { ...member.errors, [field]: undefined },
            }
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
        const savedId = await saveClientRequest({
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
          ...(currentProjectRequestId && { projectRequestId: currentProjectRequestId }),
        });

        // Delete old draft if ID changed (e.g. from dummy email to real email)
        if (pendingMemberId && pendingMemberId !== savedId && !pendingMemberId.startsWith("draft-") && !pendingMemberId.startsWith("request-")) {
          try {
            await deleteDoc(doc(db, "clientRequests", pendingMemberId));
            console.log("Deleted old member draft record:", pendingMemberId);
          } catch (delError) {
            console.warn("Failed to delete old draft document (might not exist):", delError);
          }
        }

        setMembers((prev) =>
          prev.map((m) =>
            m.id === pendingMemberId
              ? {
                  ...m,
                  id: savedId,
                  isSubmitted: true,
                  isDraft: true,
                  cid: "draft",
                  initialData: { ...m.formData },
                }
              : m
          )
        );
        toast.success(`${member.isPrimary ? "Primary member" : "Team member"} information saved to draft!`);
      } else {
        // For approved projects
        if (member.isPrimary) {
          // Primary member: save to clients collection with CID
          let pids: string[] = projects.map((p) => p.pid).filter(pid => pid !== "DRAFT");
          if (pids.length === 0 && pidParam) pids = [pidParam];

          let cidToUse = member.cid;
          if (!cidToUse || cidToUse === "pending" || cidToUse === "draft") {
            const year = new Date().getFullYear();
            cidToUse = await getNextCid(year);
          }

          if (!cidToUse) throw new Error("Could not generate a valid Client ID");

          await setDoc(
            doc(db, "clients", cidToUse),
            {
              ...result.data,
              cid: cidToUse,
              pid: pids,
              inquiryId: inquiryIdParam,
              isContactPerson: true,
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
                ? {
                    ...m,
                    cid: cidToUse,
                    isSubmitted: true,
                    initialData: { ...m.formData },
                  }
                : m
            )
          );
          toast.success("Your information saved successfully!");
        } else {
          // Other members: save as validated draft in clientRequests (needs admin approval)
          const savedId = await saveClientRequest({
            inquiryId: inquiryIdParam!,
            requestedBy: emailParam || "",
            requestedByName: members.find((m) => m.isPrimary)?.formData.name || result.data.name,
            name: result.data.name,
            email: result.data.email,
            affiliation: result.data.affiliation,
            designation: result.data.designation,
            sex: result.data.sex,
            phoneNumber: result.data.phoneNumber,
            affiliationAddress: result.data.affiliationAddress,
            isPrimary: false,
            isValidated: true,
            status: "draft",
            ...(selectedProjectPid && { projectRequestId: selectedProjectPid }),
          });

          // Delete old draft if ID changed
          if (pendingMemberId && pendingMemberId !== savedId && !pendingMemberId.startsWith("draft-") && !pendingMemberId.startsWith("request-")) {
            try {
              await deleteDoc(doc(db, "clientRequests", pendingMemberId));
              console.log("Deleted old member draft record:", pendingMemberId);
            } catch (delError) {
              console.warn("Failed to delete old draft document (might not exist):", delError);
            }
          }

          setMembers((prev) =>
            prev.map((m) =>
              m.id === pendingMemberId
                ? {
                    ...m,
                    id: savedId,
                    isSubmitted: true,
                    isDraft: true,
                    cid: "draft",
                    initialData: { ...m.formData },
                  }
                : m
            )
          );
          toast.success("Team member information saved! Submit for admin approval when ready.");
        }
      }
    } catch (error) {
      console.error("Submission error:", error);
      const msg = error instanceof Error ? error.message : "Failed to save information";
      toast.error(msg);
    } finally {
      setSubmitting(false);
      setPendingMemberId(null);
    }
  };

  const handleSaveDraft = async (memberId: string) => {
    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    if (!member.formData.name || !member.formData.email) {
      toast.error("Please provide at least Name and Email to save a draft.");
      return;
    }

    // Check if any changes were made
    const isChanged = JSON.stringify(member.formData) !== JSON.stringify(member.initialData);
    if (!isChanged) {
      toast.info("No changes have been made");
      return;
    }

    setSubmitting(true);
    try {
      // Check if this is a draft project
      const isDraftProject = projectDetails?.isDraft || projectDetails?.pid === "DRAFT";

      if (isDraftProject && inquiryIdParam) {
        // For draft projects, save to clientRequests collection (without validation)
        const savedId = await saveClientRequest({
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
          ...(currentProjectRequestId && { projectRequestId: currentProjectRequestId }),
        });

        // Delete old draft if ID changed (e.g. from dummy email to real email)
        if (memberId && memberId !== savedId && !memberId.startsWith("draft-") && !memberId.startsWith("request-")) {
          try {
            await deleteDoc(doc(db, "clientRequests", memberId));
            console.log("Deleted old member draft record:", memberId);
          } catch (delError) {
            console.warn("Failed to delete old draft (might not exist):", delError);
          }
        }

        setMembers((prev) =>
          prev.map((m) =>
            m.id === memberId
              ? {
                  ...m,
                  id: savedId,
                  isDraft: true,
                  cid: "draft",
                  initialData: { ...m.formData },
                }
              : m
          )
        );
        toast.success("Draft saved for member");
      } else {
        // For approved projects
        if (member.isPrimary) {
          // Primary member: save to clients collection
          let pids: string[] = projects.map((p) => p.pid).filter(pid => pid !== "DRAFT");
          if (pids.length === 0 && pidParam) pids = [pidParam];

          let cidToUse = member.cid;
          if (!cidToUse || cidToUse === "pending" || cidToUse === "draft") {
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
          // Other members: save as draft in clientRequests (same as draft projects)
          const savedId = await saveClientRequest({
            inquiryId: inquiryIdParam!,
            requestedBy: emailParam || "",
            requestedByName: members.find((m) => m.isPrimary)?.formData.name || member.formData.name || "",
            name: member.formData.name,
            email: member.formData.email,
            affiliation: member.formData.affiliation,
            designation: member.formData.designation,
            sex: member.formData.sex,
            phoneNumber: member.formData.phoneNumber,
            affiliationAddress: member.formData.affiliationAddress,
            isPrimary: false,
            isValidated: false,
            status: "draft",
            ...(selectedProjectPid && { projectRequestId: selectedProjectPid }),
          });

          // Delete old draft if ID changed
          if (memberId && memberId !== savedId && !memberId.startsWith("draft-") && !memberId.startsWith("request-")) {
            try {
              await deleteDoc(doc(db, "clientRequests", memberId));
              console.log("Deleted old member draft record:", memberId);
            } catch (delError) {
              console.warn("Failed to delete old draft (might not exist):", delError);
            }
          }

          setMembers((prev) =>
            prev.map((m) =>
              m.id === memberId
                ? {
                    ...m,
                    id: savedId,
                    isDraft: true,
                    cid: "draft",
                    initialData: { ...m.formData },
                  }
                : m
            )
          );
          toast.success("Draft saved for team member");
        }
      }
    } catch (error) {
      console.error("Draft save error:", error);
      toast.error("Failed to save draft");
    } finally {
      setSubmitting(false);
    }
  };

  // Called after client confirms the Client Conforme
  const handleConformeConfirm = () => {
    setShowConformeModal(false);
    if (conformePendingAction === "draft") {
      handleSubmitProjectForApproval();
    } else if (conformePendingAction === "team") {
      setShowSubmitForApprovalModal(true);
    }
    setConformePendingAction(null);
  };

  // Helper function to update conforme status
  const updateConformeStatus = async (status: 'completed' | 'abandoned') => {
    try {
      const conformeId = localStorage.getItem('currentConformeId');
      if (conformeId) {
        const { updateDoc, doc } = await import('firebase/firestore');
        await updateDoc(doc(db, 'clientConformes', conformeId), {
          'data.status': status,
          'data.lastUpdated': serverTimestamp(),
          'data.completionTimestamp': status === 'completed' ? serverTimestamp() : null
        });
        console.log(`✅ Conforme status updated to: ${status}`);
        
        // Clear the stored ID after completion
        if (status === 'completed') {
          localStorage.removeItem('currentConformeId');
        }
      }
    } catch (error) {
      console.error('Error updating conforme status:', error);
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
      // Validate primary member before showing conforme
      const primaryCheck = members.find((m) => m.isPrimary);
      if (!primaryCheck?.isSubmitted) {
        toast.error("Please save your information as Primary Member first");
        return;
      }
      // Show Client Conforme before proceeding
      setConformePendingAction("draft");
      setShowConformeModal(true);
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
        "Please complete and save all member forms before submitting"
      );
      return;
    }

    // Show Client Conforme before proceeding
    setConformePendingAction("team");
    setShowConformeModal(true);
  };

  const handleConfirmSubmitForApproval = async () => {
    setShowSubmitForApprovalModal(false);
    setSubmitting(true);

    // Show Step 3 progress
    const toastId = toast.loading("🔄 Step 3 of 3: Processing submission...", {
      description: "Submitting team members for administrator review",
      duration: Infinity
    });

    try {
      if (!selectedProjectPid || !inquiryIdParam) {
        toast.error("Missing project context", { id: toastId });
        return;
      }

      const draftMembers = members.filter((m) => m.isDraft && !m.isPrimary);
      
      // Update conforme status to completed since submission is proceeding
      await updateConformeStatus('completed');
      
      // ... rest of the existing function

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
        "✅ Team members successfully submitted for administrator review",
        { id: toastId, duration: 4000 }
      );
    } catch (error) {
      console.error("Submit for approval error:", error);
      toast.error("Failed to submit for approval", { id: toastId });
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

    // Show Step 3 progress
    const toastId = toast.loading("🔄 Step 3 of 3: Processing submission...", {
      description: "Submitting project and primary member for administrator review",
      duration: Infinity
    });

    try {
      if (!inquiryIdParam || !emailParam || !projectRequest) {
        toast.error("Missing required information", { id: toastId });
        return;
      }

      // Update conforme status to completed since submission is proceeding
      await updateConformeStatus('completed');
      
      const primaryMember = members.find((m) => m.isPrimary);
      if (!primaryMember) {
        toast.error("Primary member not found", { id: toastId });
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
        "✅ Project and team members successfully submitted for administrator review",
        { id: toastId, duration: 4000 }
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
      if (currentProjectRequestId) {
        const updatedProjectRequest = await getProjectRequestById(currentProjectRequestId);
        if (updatedProjectRequest) {
          setProjectRequest(updatedProjectRequest);
        }
      }
    } catch (error) {
      console.error("Submit project error:", error);
      toast.error("Failed to submit project for approval", { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectProject = (project: ProjectDetails) => {
    if (!emailParam || !inquiryIdParam) {
      toast.error("Missing required parameters.");
      return;
    }
    
    if (!project) {
      toast.error("Invalid project selected.");
      return;
    }
    
    console.log("Selecting project:", project.pid);
    
    // Simply update selection state - the useEffect will handle merging all state
    setSelectedProjectPid(project.pid || "");
    setProjectDetails(project);
    
    // Reset secondary states that are project-specific 
    // projectRequest and approvalStatus will be updated by their respective effects/subscriptions
    if (!project.isDraft) {
        setProjectRequest(null);
    }
    
    // Preserve current expanded members state - don't force primary to expand
    // setExpandedMembers(new Set(["primary"])); // Removed - let user control expansion state
    
    // Close mobile sidebar if open
    setMobileSidebarOpen(false);
  };

  const handleCreateNewProject = () => {
    if (!emailParam || !inquiryIdParam) {
      toast.error("Missing required parameters to create a new project.");
      return;
    }
    
    const params = new URLSearchParams({
      email: emailParam,
      inquiryId: inquiryIdParam,
      new: "true",
    });
    router.push(`/client/project-info?${params.toString()}`);
  };

  const toggleProjectDocs = async (project: ProjectDetails) => {
    const pid = project.pid;
    const isExpanding = !expandedProjectDocs.has(pid);
    
    setExpandedProjectDocs((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) {
        next.delete(pid);
      } else {
        next.add(pid);
      }
      return next;
    });

    // Fetch documents if expanding and not already loaded
    if (isExpanding && !projectDocuments.has(pid)) {
      setProjectDocuments((prev) => new Map(prev).set(pid, {
        quotations: [],
        chargeSlips: [],
        loading: true,
      }));

      try {
        // Fetch quotations by inquiry ID (since quotations are linked to inquiries)
        const quotations = await getQuotationsByInquiryId(project.inquiryId);
        
        // Fetch charge slips by project ID
        const chargeSlips = project.pid !== "DRAFT" && !project.pid.startsWith("PENDING-")
          ? await getChargeSlipsByProjectId(project.pid)
          : [];

        setProjectDocuments((prev) => new Map(prev).set(pid, {
          quotations,
          chargeSlips,
          loading: false,
        }));
      } catch (error) {
        console.error("Error fetching project documents:", error);
        toast.error("Failed to load documents");
        setProjectDocuments((prev) => new Map(prev).set(pid, {
          quotations: [],
          chargeSlips: [],
          loading: false,
        }));
      }
    }
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
      if (!date) return "—";
      const d = typeof date === "string" ? new Date(date) : date;
      if (isNaN(d.getTime())) return "—";
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
          {member.errors.sex && (
            <p className="text-xs text-red-500 mt-1">{member.errors.sex}</p>
          )}
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
                {member.cid && member.cid !== "pending" && member.cid !== "draft" && (
                  <span className="text-[11px] font-mono text-[#166FB5]/70 bg-blue-50/50 px-1.5 rounded border border-blue-100/30">
                    Client ID: {member.cid}
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
              {status.label}
            </Badge>
            <div className="p-1 hover:bg-slate-100 rounded-full transition-colors">
              <ChevronRight
                className={cn(
                  "h-6 w-6 text-[#166FB5] transition-transform duration-200",
                  isExpanded && "rotate-90"
                )}
              />
            </div>
          </div>
        </button>

        {/* Card Body – expanded form */}
        {isExpanded && (
          <CardContent className="px-3 pb-3 pt-0 border-t border-slate-100">
            {/* Remove button for non-primary draft members */}
            {!member.isPrimary &&
              projectDetails?.status !== "Completed" &&
              member.isDraft && (
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
      {/* Header - Redesigned as a Card */}
      <div className="p-4 border-b bg-white">
        <div className="bg-gradient-to-br from-[#166FB5] to-[#4038AF] rounded-2xl p-5 shadow-md border border-[#166FB5]/20 relative overflow-hidden group">
          {/* Decorative background element */}
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-500" />
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/15 backdrop-blur-md rounded-xl border border-white/20 shadow-inner">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-white font-extrabold text-xl tracking-tight leading-none">
                  Client Portal
                </h2>
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-white/70 text-[10px] uppercase font-bold tracking-widest">
                    Active Session
                  </span>
                </div>
              </div>
            </div>
            
            {/* Close button – mobile only */}
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden text-white/80 hover:text-white hover:bg-white/20 rounded-xl p-2 transition-all duration-200 border border-transparent hover:border-white/20"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
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

      {/* New Project button (shown when Projects list is collapsed) - REMOVED */}

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
            <div className="pl-4 pr-2 py-2 space-y-1">
              {projects.map((project) => {
                // Defensive checks for project properties
                if (!project || !project.pid) {
                  console.warn("Invalid project in sidebar:", project);
                  return null;
                }
                
                const isClickable = !project.isDraft && project.status === "Ongoing";
                const isSelected = selectedProjectPid === project.pid;
                const isDocsExpanded = expandedProjectDocs.has(project.pid);
                const docs = projectDocuments.get(project.pid);
                const quotationCount = docs?.quotations.length || 0;
                const chargeSlipCount = docs?.chargeSlips.length || 0;
                
                return (
                  <div key={project.pid} className="space-y-0.5">
                    {/* Main project button */}
                    <div className="relative">
                      <div
                        className={cn(
                          "w-full text-left p-3 pr-12 rounded-lg transition-all duration-150 cursor-pointer hover:bg-slate-50",
                          isSelected
                            ? "bg-[#166FB5]/8 border-l-[3px] border-l-[#166FB5] shadow-sm"
                            : "border-l-[3px] border-l-transparent opacity-80"
                        )}
                        onClick={() => handleSelectProject(project)}
                      >
                        <div className="flex items-center justify-between">
                          <p
                            className={cn(
                              "font-medium text-sm truncate",
                              isSelected ? "text-[#166FB5]" : "text-slate-700"
                            )}
                          >
                            {project.title || "Untitled Project"}
                          </p>
                          {isSelected && (
                            <CheckCircle2 className="h-3 w-3 text-[#166FB5]" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono text-slate-400">
                            ID: {project.pid}
                          </span>
                          {project.status !== "Pending Approval" && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] h-4 px-1.5 border",
                                statusColors[project.status] || "bg-slate-100 text-slate-600"
                              )}
                            >
                              {project.status || "Unknown"}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleProjectDocs(project);
                          }}
                          className={cn(
                            "absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-lg transition-all duration-200 shadow-sm border",
                            isDocsExpanded 
                              ? "bg-[#166FB5] border-[#166FB5] text-white" 
                              : "bg-white border-slate-200 text-slate-400 hover:border-[#166FB5] hover:text-[#166FB5] hover:bg-slate-50"
                          )}
                          title="View quotations and charge slips"
                        >
                          <ChevronRight
                            className={cn(
                              "h-5 w-5 transition-transform duration-300",
                              isDocsExpanded && "rotate-90"
                            )}
                          />
                        </button>
                      
                    </div>

                    {/* Collapsible documents section */}
                    {isDocsExpanded && (
                      <div className="ml-3 pl-3 border-l-2 border-slate-200 space-y-1 py-1">
                        {docs?.loading ? (
                          <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Loading documents...</span>
                          </div>
                        ) : (
                          <>
                            {/* Quotations section */}
                            <div className="px-2 py-1.5 rounded hover:bg-slate-50">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-3.5 w-3.5 text-purple-600" />
                                  <span className="text-xs font-medium text-slate-700">
                                    Quotations
                                  </span>
                                </div>
                                <Badge
                                  variant="secondary"
                                  className="h-4 px-1.5 text-[10px] bg-purple-100 text-purple-700"
                                >
                                  {quotationCount}
                                </Badge>
                              </div>
                              {quotationCount > 0 ? (
                                <div className="space-y-0.5 ml-5">
                                  {docs?.quotations.map((quotation) => (
                                    <a
                                      key={quotation.id}
                                      href={`/client/view-document?type=quotation&ref=${quotation.referenceNumber}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block text-[11px] text-slate-500 hover:text-[#166FB5] hover:underline truncate"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {quotation.referenceNumber}
                                    </a>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[10px] text-slate-400 ml-5">
                                  No quotations yet
                                </p>
                              )}
                            </div>

                            {/* Charge Slips section */}
                            <div className="px-2 py-1.5 rounded hover:bg-slate-50">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <Receipt className="h-3.5 w-3.5 text-green-600" />
                                  <span className="text-xs font-medium text-slate-700">
                                    Charge Slips
                                  </span>
                                </div>
                                <Badge
                                  variant="secondary"
                                  className="h-4 px-1.5 text-[10px] bg-green-100 text-green-700"
                                >
                                  {chargeSlipCount}
                                </Badge>
                              </div>
                              {chargeSlipCount > 0 ? (
                                <div className="space-y-0.5 ml-5">
                                  {docs?.chargeSlips.map((chargeSlip) => (
                                    <a
                                      key={chargeSlip.id}
                                      href={`/client/view-document?type=charge-slip&ref=${chargeSlip.id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block text-[11px] text-slate-500 hover:text-[#166FB5] hover:underline truncate"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {chargeSlip.chargeSlipNumber}
                                    </a>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[10px] text-slate-400 ml-5">
                                  No charge slips yet
                                </p>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* New Project button at the bottom of the list - REMOVED */}
            </div>
          )}
        </div>
      )}

      {/* Footer actions - Fixed at bottom */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 mt-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/portal")}
          className="w-full justify-start text-[#B9273A] hover:bg-[#B9273A]/10 hover:text-[#B9273A] h-12 transition-all rounded-xl shadow-sm border border-transparent hover:border-[#B9273A]/20"
        >
          <div className="p-2 bg-[#B9273A]/10 rounded-lg mr-3">
            <LogOut className="h-4 w-4" />
          </div>
          <span className="font-semibold text-sm">Exit Portal</span>
        </Button>
      </div>
    </div>
  );

  // ────────────────────────────────────────────────────────────────
  //  Loading states
  // ────────────────────────────────────────────────────────────────

  // Show loading while authentication is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return null; // This will be handled by the useEffect redirect
  }

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
              Project ID: {projectDetails.pid}
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
              {/* Draft/Pending/Approved status banner */}
              {(projectDetails?.isDraft || projectDetails?.status === "Ongoing" || projectDetails?.status === "Pending Approval" || projectDetails?.status === "Rejected") && (
                <div className={`rounded-lg p-4 border ${
                  projectDetails.status === "Draft" 
                    ? "bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200"
                    : projectDetails.status === "Pending Approval"
                    ? "bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200"
                    : projectDetails.status === "Ongoing"
                    ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200"
                    : "bg-gradient-to-r from-red-50 to-pink-50 border-red-200"
                }`}>
                  <div className="flex items-start gap-3">
                    {projectDetails.status === "Pending Approval" ? (
                      <Clock className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    ) : projectDetails.status === "Ongoing" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : projectDetails.status === "Rejected" ? (
                      <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 space-y-2">
                      {projectDetails.status === "Draft" ? (
                        <>
                          <p className="text-sm font-semibold text-orange-900 leading-none">
                            Action Required: Complete Project Submission
                          </p>
                          <p className="text-sm text-orange-700 leading-relaxed">
                            Please provide your details as the <strong>Primary Member</strong>. Once finished, scroll to the bottom and click "<strong>Submit Project & Team for Approval</strong>" to send your application for admin review. After approval, you will be assigned a <strong>Project ID</strong> and <strong>Client ID</strong>.
                          </p>
                        </>
                      ) : projectDetails.status === "Pending Approval" ? (
                        <>
                          <p className="text-sm font-semibold text-orange-900 leading-none">
                            Application Under Review
                          </p>
                          <p className="text-sm text-orange-700 leading-relaxed">
                            Your project and team members have been submitted and are currently being reviewed by our administration team. You will receive a notification and your <strong>Project ID</strong> once approved. <strong>No further action is required at this time.</strong>
                          </p>
                        </>
                      ) : projectDetails.status === "Ongoing" ? (
                        <>
                          <p className="text-sm font-semibold text-green-900 leading-none">
                            Project Approved
                          </p>
                          <p className="text-sm text-green-700 leading-relaxed">
                            Your project has been approved and is now active. You can now view your unique <strong>Project ID</strong> and access all project documents below.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-red-900 leading-none">
                            Project Rejected
                          </p>
                          <p className="text-sm text-red-700 leading-relaxed">
                            Your project submission was not approved. Please check your email or the feedback section for details on necessary corrections before resubmitting.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

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
                      className="font-mono text-[10px] bg-blue-50 text-[#166FB5] border-blue-200 px-2 py-0.5"
                    >
                      Project ID: {projectDetails.pid}
                    </Badge>
                    {projectDetails.status !== "Pending Approval" && (
                      <Badge
                        className={cn(
                          "border text-xs",
                          statusColors[projectDetails.status] ||
                            "bg-slate-100 text-slate-600"
                        )}
                      >
                        {projectDetails.status}
                      </Badge>
                    )}
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
                  (approvalStatus !== "approved" || members.some(m => m.isDraft && !m.isPrimary)) && (
                    <div className="pt-6 border-t-2 border-slate-200">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="text-sm text-slate-500">
                          {members.some((m) => !m.isSubmitted) ? (
                            <span className="text-[#B9273A] font-semibold flex items-center gap-1.5">
                              <AlertCircle className="h-4 w-4" />
                              Complete and save all member details to proceed
                            </span>
                          ) : projectDetails?.isDraft ? (
                            <span className="flex items-center gap-1.5 text-blue-600 font-medium">
                              <CheckCircle2 className="h-4 w-4" />
                              Ready to submit project and team details
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
                          {projectDetails?.isDraft ? "Submit Project & Team for Approval" : "Submit Team Members for Approval"}
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
        onCancel={() => {
          setShowSubmitForApprovalModal(false);
        }}
        loading={submitting}
        title="📋 Final Review & Confirmation"
        description="Please review the team members below before final submission. This is the last step before administrator review."
        confirmLabel="Submit to Administrator"
        cancelLabel="Go Back"
      >
        <div className="space-y-4">
          {/* Progress Indicator */}
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Step 2 of 3
            </Badge>
            <span className="text-xs text-slate-500">Review Team Members</span>
          </div>
          
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
        </div>
      </ConfirmationModalLayout>

      {/* Submit project for approval confirmation modal */}
      <ConfirmationModalLayout
        open={showSubmitProjectModal}
        onConfirm={handleConfirmSubmitProject}
        onCancel={() => {
          setShowSubmitProjectModal(false);
        }}
        loading={submitting}
        title="📋 Final Review & Confirmation"
        description="Please review your project and member information below before final submission to administrators."
        confirmLabel="Submit to Administrator"
        cancelLabel="Go Back"
      >
        <div className="space-y-4">
          {/* Progress Indicator */}
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Step 2 of 3
            </Badge>
            <span className="text-xs text-slate-500">Review Project Details</span>
          </div>
          
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
        </div>
      </ConfirmationModalLayout>

      {/* Client Conforme — must be agreed before final submission */}
      <ClientConformeModal
        open={showConformeModal}
        onConfirm={handleConformeConfirm}
        onCancel={() => {
          setShowConformeModal(false);
          setConformePendingAction(null);
          // Mark as abandoned if user cancels after agreeing
          updateConformeStatus('abandoned');
        }}
        loading={submitting}
        clientName={members.find((m) => m.isPrimary)?.formData.name ?? ""}
        designation={members.find((m) => m.isPrimary)?.formData.designation ?? ""}
        affiliation={members.find((m) => m.isPrimary)?.formData.affiliation ?? ""}
        projectTitle={
          projectRequest?.title ??
          projectDetails?.title ??
          ""
        }
        fundingAgency={
          projectRequest?.fundingInstitution ??
          projectDetails?.fundingInstitution ??
          ""
        }
        inquiryId={inquiryIdParam ?? ""}
        clientEmail={user?.email ?? ""}
        projectPid={selectedProjectPid ?? undefined}
        projectRequestId={currentProjectRequestId ?? undefined}
      />
    </>
  );
}
