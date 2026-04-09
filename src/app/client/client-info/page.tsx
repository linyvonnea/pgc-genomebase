"use client";

// Client Portal — Two-Panel Layout
// Left pane (1/4): Projects navigation sidebar
// Right pane (3/4): Selected project details + team member management

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { cancelInquiryByClient, subscribeToInquiryById } from "@/services/inquiryService";
import { Inquiry } from "@/types/Inquiry";
import { getChargeSlipsByProjectId } from "@/services/chargeSlipService";
import { getSampleFormsByProjectId } from "@/services/sampleFormService";
import { getConfigurationSettings, DEFAULT_PORTAL_FEATURES } from "@/services/configurationSettingsService";
import { QuotationRecord } from "@/types/Quotation";
import FloatingChatWidget from "@/components/chat/FloatingChatWidget";
import { ChargeSlipRecord } from "@/types/ChargeSlipRecord";
import { SampleFormSummary } from "@/types/SampleForm";
import { ApprovalStatus } from "@/types/MemberApproval";
import { ConfigurationSettings } from "@/types/ConfigurationSettings";
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
  Settings,
  Key,
  Info,
  Mail,
  Smartphone,
  MapPin,
  Briefcase,
  FlaskConical,
  FileSpreadsheet,
  ShieldEllipsis,
  Stamp,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ClientConformeModal from "@/components/forms/ClientConformeModal";
import UploadReceipt from "@/components/client/UploadReceipt";

// ────────────────────────────────────────────────────────────────
//  Formatting Helpers
// ────────────────────────────────────────────────────────────────

// Format service type for display
const formatServiceType = (type: string | null | undefined): string => {
  if (!type) return "—";
  return type.charAt(0).toUpperCase() + type.slice(1);
};

// Format workflow type for display
const formatWorkflowType = (type: string | null | undefined): string => {
  if (!type) return "—";
  if (type === "complete-bioinfo") return "Complete molecular workflow with Bioinformatics Analysis";
  if (type === "complete") return "Complete Molecular workflow only (DNA Extraction to Sequencing)";
  if (type === "individual") return "Individual Assay";
  return type
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatBioinfoOption = (option: string): string => {
  switch (option) {
    case "whole-genome-assembly":
      return "Whole Genome Assembly";
    case "metabarcoding-downstream":
      return "Metabarcoding with Downstream Analysis";
    case "metabarcoding-preprocessing":
      return "Metabarcoding with Pre-processing Only";
    case "transcriptomics":
      return "Transcriptomics (QC to Annotation)";
    case "phylogenetics":
      return "Phylogenetics (1 Marker)";
    case "whole-genome-assembly-annotation":
      return "Whole Genome Assembly and Annotation";
    case "dna-extraction":
      return "DNA Extraction";
    case "quantification":
      return "Quantification";
    case "library-preparation":
      return "Library Preparation";
    case "sequencing":
      return "Sequencing";
    case "bioinformatics-analysis":
      return "Bioinformatics Analysis";
    case "genome-assembly":
      return "Whole Genome Assembly";
    case "metabarcoding":
      return "Metabarcoding with Downstream Analysis";
    case "pre-processing":
      return "Metabarcoding with Pre-processing Only";
    case "assembly-annotation":
      return "Whole Genome Assembly and Annotation";
    default:
      return option;
  }
};

const flattenBioinformaticsDetails = (
  input: Record<string, any> | null | undefined,
  prefix = ""
): Array<{ key: string; value: string }> => {
  if (!input) return [];

  const rows: Array<{ key: string; value: string }> = [];
  Object.entries(input).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    const path = prefix ? `${prefix}.${key}` : key;

    if (Array.isArray(value)) {
      if (value.length > 0) rows.push({ key: path, value: value.join(", ") });
      return;
    }

    if (typeof value === "object") {
      rows.push(...flattenBioinformaticsDetails(value as Record<string, any>, path));
      return;
    }

    rows.push({ key: path, value: String(value) });
  });

  return rows;
};

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
  status?: string;
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
  // Load member expansion state from localStorage for persistence across refreshes
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('expandedMembers');
      console.log('Loading expanded members from localStorage:', saved);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          console.log('Parsed expansion state:', parsed);
          return new Set(parsed);
        } catch (e) {
          console.error('Failed to parse localStorage expandedMembers:', e);
          return new Set();
        }
      }
    }
    console.log('No localStorage data, starting with empty set');
    return new Set(); // Start with all collapsed, let user decide
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [expandedProjectDocs, setExpandedProjectDocs] = useState<Set<string>>(new Set());
  const [expandedCsIds, setExpandedCsIds] = useState<Set<string>>(new Set());
  const [configSettings, setConfigSettings] = useState<ConfigurationSettings | null>(null);

  const [projectDocuments, setProjectDocuments] = useState<
    Map<string, { 
      quotations: QuotationRecord[]; 
      chargeSlips: ChargeSlipRecord[]; 
      sampleForms: SampleFormSummary[];
      serviceReports: any[];
      officialReceipts: any[];
      loading: boolean 
    }>
  >(new Map());

  // ── Inquiry context state ─────────────────────────────────────
  const [currentInquiry, setCurrentInquiry] = useState<Inquiry | null>(null);
  const [inquiryQuotations, setInquiryQuotations] = useState<QuotationRecord[]>([]);
  const [loadingQuotations, setLoadingQuotations] = useState(false);

  // Proceed with Service modal state
  const [showProceedModal, setShowProceedModal] = useState(false);
  const [selectedQuotationRef, setSelectedQuotationRef] = useState<string | null>(null);
  const [showCancelInquiryModal, setShowCancelInquiryModal] = useState(false);
  const [cancelInquiryReason, setCancelInquiryReason] = useState("");
  const [cancelInquirySubmitting, setCancelInquirySubmitting] = useState(false);

  // ── Data state ────────────────────────────────────────────────
  const [members, setMembers] = useState<ClientMember[]>([]);
  const [projects, setProjects] = useState<ProjectDetails[]>([]);

  // Initialize expandedProjectDocs when projects list is updated or pidParam changes
  useEffect(() => {
    // Completely removed auto-expansion logic to ensure projects are always collapsed by default
    // Even if pidParam is present, we start with empty set to follow user request
    setExpandedProjectDocs(new Set());
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadConfig = async () => {
      try {
        const data = await getConfigurationSettings();
        if (isMounted) setConfigSettings(data);
      } catch (error) {
        console.error("Failed to load portal configuration:", error);
      }
    };

    loadConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  const portalFeatures = configSettings?.portalFeatures ?? DEFAULT_PORTAL_FEATURES;

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
  const [activeSavingId, setActiveSavingId] = useState<string | null>(null);
  const savingDraftIdsRef = useRef<Set<string>>(new Set());

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

  // 1.2. Subscribe to Inquiry and Quotations
  useEffect(() => {
    if (!inquiryIdParam) return;

    // Fetch Inquiry details
    const unsubInquiry = subscribeToInquiryById(inquiryIdParam, (inquiry) => {
      setCurrentInquiry(inquiry);
    });

    // Fetch Quotations for this inquiry
    const fetchInquiryQuotations = async () => {
      setLoadingQuotations(true);
      try {
        const docs = await getQuotationsByInquiryId(inquiryIdParam);
        setInquiryQuotations(docs);
      } catch (err) {
        console.error("Error fetching inquiry quotations:", err);
      } finally {
        setLoadingQuotations(false);
      }
    };

    fetchInquiryQuotations();

    return () => {
      unsubInquiry();
    };
  }, [inquiryIdParam]);

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
        // Prioritize draft for the current project if we have an ID
        const primaryDraftRequest = fetchedClientRequests.find(r => {
             const emailMatch = r.email.toLowerCase() === emailParam?.toLowerCase();
             if (!emailMatch) return false;
             
             // If we have current project request ID, match it
             if (currentProjectRequestId && r.projectRequestId === currentProjectRequestId) {
                 return true;
             }
             
             // If we have a selected project PID (for approved projects but still in request phase)
             if (selectedProjectPid && r.projectRequestId === selectedProjectPid) {
                 return true;
             }

             // Fallback to inquiry match if no specific project link found
             return true; 
        });
        
        if (primaryDraftRequest) {
            primaryMember = {
                id: "primary",
                cid: "draft",
                formData: {
                  name: primaryDraftRequest.name || "",
                  email: primaryDraftRequest.email || emailParam || "",
                  affiliation: primaryDraftRequest.affiliation || "",
                  designation: primaryDraftRequest.designation || "",
                  sex: (primaryDraftRequest.sex || "") as any,
                  phoneNumber: primaryDraftRequest.phoneNumber || "",
                  affiliationAddress: primaryDraftRequest.affiliationAddress || "",
                },
                initialData: {
                  name: primaryDraftRequest.name || "",
                  email: primaryDraftRequest.email || emailParam || "",
                  affiliation: primaryDraftRequest.affiliation || "",
                  designation: primaryDraftRequest.designation || "",
                  sex: (primaryDraftRequest.sex || "") as any,
                  phoneNumber: primaryDraftRequest.phoneNumber || "",
                  affiliationAddress: primaryDraftRequest.affiliationAddress || "",
                },
                errors: {},
                isSubmitted: !!primaryDraftRequest.isValidated,
                isPrimary: true,
                isDraft: true,
                status: primaryDraftRequest.status // Injecting real status from Firestore
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
              sex: "" as any,
              phoneNumber: "",
              affiliationAddress: "",
            },
            initialData: {
              name: "",
              email: emailParam,
              affiliation: "",
              designation: "",
              sex: "" as any,
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
    
    // Deduplicate by email to prevent "other member double" bug during submission transition
    const seenEmails = new Set<string>();
    const uniqueMembers = allMembers.filter(member => {
      const email = member.formData?.email?.toLowerCase()?.trim();
      if (!email) return true;
      if (seenEmails.has(email)) return false;
      seenEmails.add(email);
      return true;
    });

    setMembers(uniqueMembers);
    // Don't automatically expand primary member - respect user's saved preference from localStorage

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
        "✅ Project and team members approved and registered!",
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
          ? "Please complete and save your information as Primary Member first before adding new team members."
          : "Please finish and save the member details you just added before adding a new one."
      );
      setExpandedMembers((prev) => {
        const newSet = new Set([...prev, unsavedMember.id]);
        // Persist when auto-expanding to show validation error
        if (typeof window !== 'undefined') {
          localStorage.setItem('expandedMembers', JSON.stringify(Array.from(newSet)));
        }
        return newSet;
      });
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

      // Don't auto-expand new members - let user decide when to open them
      // toast.success("New member slot added. Please fill in their details.");

      // UPDATE: Auto-expand ONLY the new member (collapse primary/others)
      setExpandedMembers(() => {
        const next = new Set([savedDocId]);
        // Persist to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('expandedMembers', JSON.stringify(Array.from(next)));
        }
        return next;
      });
      
      toast.success("New member slot added");
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

      // Collapse deleted member and persist to localStorage
      setExpandedMembers((prev) => {
        const next = new Set(prev);
        next.delete(memberToDelete);
        if (typeof window !== 'undefined') {
          localStorage.setItem('expandedMembers', JSON.stringify(Array.from(next)));
        }
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

    // Start loading and set as saving to disable the background button
    setSubmitting(true);
    savingDraftIdsRef.current.add(pendingMemberId);
    setActiveSavingId(pendingMemberId);

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
        // Primary member: if an existing clientRequests doc exists (member.id), update it instead of creating a new doc
        let savedId: string;
        if (member.isPrimary && pendingMemberId && !pendingMemberId.startsWith("draft-") && !pendingMemberId.startsWith("request-")) {
          // Update existing clientRequests document
          const docRef = doc(db, "clientRequests", pendingMemberId);
          await setDoc(docRef, {
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
            updatedAt: serverTimestamp(),
          }, { merge: true });
          savedId = pendingMemberId;
        } else {
          // Create or update via saveClientRequest (uses inquiryId + email-based ID)
          savedId = await saveClientRequest({
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
            status: (member.isPrimary || isDraftProject) ? "draft" : "pending",
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
        toast.success(
          `${member.isPrimary ? "Primary member" : "Team member"} details confirmed and saved successfully.`
        );
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
            status: "pending",
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
      setShowConfirmModal(false);
      setSubmitting(false);
      savingDraftIdsRef.current.delete(pendingMemberId);
      setActiveSavingId(null);
      setPendingMemberId(null);
    }
  };

  const handleSaveDraft = async (memberId: string) => {
    if (savingDraftIdsRef.current.has(memberId)) return;

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

    // For approved projects, we show a confirmation modal first
    const isDraftProject = projectDetails?.isDraft || projectDetails?.pid === "DRAFT";
    if (!isDraftProject) {
      setPendingMemberId(memberId);
      setShowConfirmModal(true);
      // We don't disable yet, it will be disabled when handleConfirmSave is called
      return;
    }

    savingDraftIdsRef.current.add(memberId);
    setSubmitting(true);
    setActiveSavingId(memberId);
    try {
      if (inquiryIdParam) {
        // For draft projects, save to clientRequests collection (without validation)
        // Primary member: if existing clientRequests doc exists, update it instead of creating new
        let savedIdDraft: string;
        if (member.isPrimary && memberId && !memberId.startsWith("draft-") && !memberId.startsWith("request-")) {
          const docRef = doc(db, "clientRequests", memberId);
          await setDoc(docRef, {
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
            updatedAt: serverTimestamp(),
          }, { merge: true });
          savedIdDraft = memberId;
        } else {
          savedIdDraft = await saveClientRequest({
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

          // Delete old draft if ID changed
          if (memberId && memberId !== savedIdDraft && !memberId.startsWith("draft-") && !memberId.startsWith("request-")) {
            try {
              await deleteDoc(doc(db, "clientRequests", memberId));
              console.log("Deleted old member draft record:", memberId);
            } catch (delError) {
              console.warn("Failed to delete old draft (might not exist):", delError);
            }
          }
        }

        setMembers((prev) =>
          prev.map((m) =>
            m.id === memberId
              ? {
                  ...m,
                  id: savedIdDraft,
                  isDraft: true,
                  cid: "draft",
                  initialData: { ...m.formData },
                }
              : m
          )
        );
        toast.success("Member details saved as draft");
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
          toast.success("Member details saved as draft");
        }
      }
    } catch (error) {
      console.error("Draft save error:", error);
      toast.error("Failed to save draft");
    } finally {
      savingDraftIdsRef.current.delete(memberId);
      setSubmitting(false);
      setActiveSavingId(null);
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
        `Please finalize and save all ${unsavedCount} member details before submitting for approval`
      );
      return;
    }

    // Check if this is a draft project
    if (projectDetails?.isDraft) {
      // Validate primary member before showing conforme
      const primaryCheck = members.find((m) => m.isPrimary);
      if (!primaryCheck?.isSubmitted) {
        toast.error("Please complete and save your primary member details first");
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
      toast.error("Please complete and save your primary member details first");
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
        members
          .filter((m) => m.isSubmitted || m.isDraft) // Include both primary and team members if they are submitted/draft
          .map((m) => ({
            tempId: m.id,
            isPrimary: m.isPrimary,
            isValidated: m.isSubmitted,
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
      toast.error("Please complete and save your primary member details first");
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

  const handleProceedWithService = (quotationRef: string) => {
    setSelectedQuotationRef(quotationRef);
    setShowProceedModal(true);
  };

  const handleConfirmProceedWithService = () => {
    setShowProceedModal(false);
    if (!emailParam ||!inquiryIdParam || !selectedQuotationRef) {
      toast.error("Missing required parameters to proceed.");
      return;
    }
    
    // Store the selected quotation reference in sessionStorage for later status update
    sessionStorage.setItem('selectedQuotationRef', selectedQuotationRef);
    
    const params = new URLSearchParams({
      email: emailParam,
      inquiryId: inquiryIdParam,
      quotationRef: selectedQuotationRef,
      new: "true",
    });
    router.push(`/client/project-info?${params.toString()}`);
  };

  const handleConfirmCancelInquiry = async () => {
    if (!inquiryIdParam) {
      toast.error("Missing inquiry ID.");
      return;
    }

    setCancelInquirySubmitting(true);
    try {
      const trimmedReason = cancelInquiryReason.trim();
      await cancelInquiryByClient(inquiryIdParam, trimmedReason.length > 0 ? trimmedReason : null);
      toast.success("Your request has been cancelled.");
      setShowCancelInquiryModal(false);
      setCancelInquiryReason("");
    } catch (error) {
      console.error("Failed to cancel inquiry:", error);
      toast.error("Failed to cancel the request. Please try again.");
    } finally {
      setCancelInquirySubmitting(false);
    }
  };

  const loadProjectDocuments = useCallback(async (project: ProjectDetails) => {
    const pid = project.pid;
    if (!pid || projectDocuments.has(pid)) return;

    setProjectDocuments((prev) => new Map(prev).set(pid, {
      quotations: [],
      chargeSlips: [],
      sampleForms: [],
      serviceReports: [],
      officialReceipts: [],
      loading: true,
    }));

    try {
      const quotations = await getQuotationsByInquiryId(project.inquiryId);

      const chargeSlips = project.pid !== "DRAFT" && !project.pid.startsWith("PENDING-")
        ? await getChargeSlipsByProjectId(project.pid)
        : [];

      const sampleForms = portalFeatures.sampleForms && project.pid !== "DRAFT" && !project.pid.startsWith("PENDING-")
        ? await getSampleFormsByProjectId(project.pid)
        : [];

      let officialReceipts: any[] = [];
      if (portalFeatures.officialReceipts) {
        try {
          if (project.pid && project.pid !== "DRAFT" && !project.pid.startsWith("PENDING-")) {
            const receiptsSnapshot = await getDocs(collection(db, "projects", project.pid, "officialReceipts"));
            officialReceipts = receiptsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          }
        } catch (fetchReceiptError) {
          console.warn(`Failed to load official receipts for project ${project.pid}:`, fetchReceiptError);
          officialReceipts = [];
        }
      }

      setProjectDocuments((prev) => new Map(prev).set(pid, {
        quotations,
        chargeSlips,
        sampleForms,
        serviceReports: [],
        officialReceipts,
        loading: false,
      }));
    } catch (error) {
      console.error("Error fetching project documents:", error);
      toast.error("Failed to load documents");
      setProjectDocuments((prev) => new Map(prev).set(pid, {
        quotations: [],
        chargeSlips: [],
        sampleForms: [],
        serviceReports: [],
        officialReceipts: [],
        loading: false,
      }));
    }
  }, [portalFeatures.officialReceipts, portalFeatures.sampleForms, projectDocuments]);

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
    if (isExpanding) {
      await loadProjectDocuments(project);
    }
  };

  useEffect(() => {
    if (!projectDetails?.pid) return;
    if (projectDetails.pid === "DRAFT" || projectDetails.pid.startsWith("PENDING-")) return;
    if (!projectDocuments.has(projectDetails.pid)) {
      loadProjectDocuments(projectDetails);
    }
  }, [projectDetails?.pid, projectDocuments, loadProjectDocuments]);

  // ────────────────────────────────────────────────────────────────
  //  Helpers
  // ────────────────────────────────────────────────────────────────

  const getMemberStatus = (member: ClientMember) => {
    // 1. Explicit Firestore status from member model (set during merging)
    if (member.status === "pending" || member.status === "Pending Approval") {
        return {
          label: "Pending Approval",
          color: "bg-blue-500", 
        };
    }
    
    // 2. Global project or specific approval status
    if ((projectDetails?.status === "Pending Approval" || approvalStatus === "pending") && member.isDraft) {
        return {
          label: "Pending Approval",
          color: "bg-blue-500", 
        };
    }
    
    if (member.isDraft && approvalStatus === "pending")
      return {
        label: "Pending Approval",
        color: "bg-orange-500",
      };
    if (member.isDraft && approvalStatus === "rejected")
      return { label: "Rejected", color: "bg-red-500" };
    if (member.isSubmitted)
      return {
        label: member.isDraft ? "Ready" : "Complete",
        color: member.isDraft ? "bg-blue-500" : "bg-green-500",
      };
    if (Object.keys(member.errors).length > 0)
      return { label: "Needs Attention", color: "bg-red-500" };
    return { label: "Draft", color: "bg-yellow-500" };
  };

  const toggleMemberExpand = (memberId: string) => {
    setExpandedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      // Persist to localStorage so state is remembered across page refreshes
      if (typeof window !== 'undefined') {
        console.log('Saving expanded members to localStorage:', Array.from(next));
        localStorage.setItem('expandedMembers', JSON.stringify(Array.from(next)));
      }
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
    "Pending Approval": "bg-blue-600 text-white shadow-sm",
    Rejected: "bg-red-100 text-red-700 border-red-200",
    Pending: "bg-blue-100 text-blue-700 border-blue-200",
    Ongoing: "bg-green-100 text-green-700 border-green-200",
    Completed: "bg-gray-100 text-gray-700 border-gray-200",
    Cancelled: "bg-red-100 text-red-700 border-red-200",
  };

  const timelineSteps = useMemo(() => {
    const docs = selectedProjectPid ? projectDocuments.get(selectedProjectPid) : undefined;
    const hasInquiry = !!currentInquiry;
    const hasQuotation = inquiryQuotations.length > 0;
    const isApprovalComplete =
      approvalStatus === "approved" ||
      projectDetails?.status === "Ongoing" ||
      projectDetails?.status === "Completed";
    const isApprovalPending =
      approvalStatus === "pending" || projectDetails?.status === "Pending Approval";
    const hasChargeSlip = (docs?.chargeSlips?.length ?? 0) > 0;
    const hasSampleForms = (docs?.sampleForms?.length ?? 0) > 0;
    const hasOfficialReceipts = (docs?.officialReceipts?.length ?? 0) > 0;
    const hasServiceReports = (docs?.serviceReports?.length ?? 0) > 0;

    const steps = [
      {
        key: "inquiry",
        label: "Inquiry Submission",
        complete: hasInquiry,
        detail: currentInquiry?.createdAt ? `Submitted ${formatDate(currentInquiry.createdAt)}` : "Submitted",
      },
      {
        key: "quotation",
        label: "Quotation",
        complete: hasQuotation,
        detail: hasQuotation
          ? `${inquiryQuotations.length} quotation${inquiryQuotations.length > 1 ? "s" : ""} issued`
          : "Awaiting quotation",
      },
      {
        key: "approval",
        label: "Project and Member Approval",
        complete: isApprovalComplete,
        inProgress: isApprovalPending,
        detail: isApprovalComplete
          ? "Approved"
          : isApprovalPending
          ? "Under review"
          : "Not submitted",
      },
      {
        key: "charge-slip",
        label: "Charge Slip",
        complete: hasChargeSlip,
        detail: hasChargeSlip
          ? `${docs?.chargeSlips?.length ?? 0} issued`
          : "Not issued yet",
      },
      portalFeatures.sampleForms
        ? {
            key: "sample-forms",
            label: "Sample Forms",
            complete: hasSampleForms,
            detail: hasSampleForms
              ? `${docs?.sampleForms?.length ?? 0} submitted`
              : "Awaiting sample form submission",
          }
        : null,
      portalFeatures.officialReceipts
        ? {
            key: "official-receipt",
            label: "Official Receipt",
            complete: hasOfficialReceipts,
            detail: hasOfficialReceipts
              ? `${docs?.officialReceipts?.length ?? 0} uploaded`
              : "Awaiting official receipt",
          }
        : null,
      portalFeatures.serviceReports
        ? {
            key: "service-report",
            label: "Service Report",
            complete: hasServiceReports,
            detail: hasServiceReports
              ? `${docs?.serviceReports?.length ?? 0} released`
              : "Pending service report",
          }
        : null,
    ].filter(Boolean) as Array<{
      key: string;
      label: string;
      complete: boolean;
      inProgress?: boolean;
      detail: string;
    }>;

    const firstIncompleteIndex = steps.findIndex((step) => !step.complete);

    return steps.map((step, index) => ({
      ...step,
      state: step.complete
        ? "complete"
        : step.inProgress || index === firstIncompleteIndex
        ? "current"
        : "upcoming",
    }));
  }, [
    approvalStatus,
    currentInquiry,
    inquiryQuotations,
    portalFeatures.officialReceipts,
    portalFeatures.sampleForms,
    portalFeatures.serviceReports,
    projectDetails?.status,
    projectDocuments,
    selectedProjectPid,
  ]);

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
              member.isSubmitted ||
              projectDetails?.status === "Completed" ||
              projectDetails?.status === "Pending Approval"
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
              projectDetails?.status === "Completed" ||
              projectDetails?.status === "Pending Approval"
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
              member.isSubmitted ||
              projectDetails?.status === "Completed" ||
              projectDetails?.status === "Pending Approval"
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
              member.isSubmitted ||
              projectDetails?.status === "Completed" ||
              projectDetails?.status === "Pending Approval"
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
              member.isSubmitted ||
              projectDetails?.status === "Completed" ||
              projectDetails?.status === "Pending Approval"
            }
          >
            <SelectTrigger className="bg-white border-slate-200 focus:border-[#166FB5] focus:ring-[#166FB5]/20 h-10 disabled:opacity-70">
              <SelectValue placeholder="Select Sex at Birth" />
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
              member.isSubmitted ||
              projectDetails?.status === "Completed" ||
              projectDetails?.status === "Pending Approval"
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
              member.isSubmitted ||
              projectDetails?.status === "Completed" ||
              projectDetails?.status === "Pending Approval"
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
            activeSavingId === member.id ||
            submitting ||
            projectDetails?.status === "Completed" ||
            projectDetails?.status === "Pending Approval"
          }
          variant="outline"
          className="h-10 px-6 border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold disabled:opacity-50"
        >
          {activeSavingId === member.id ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </>
          )}
        </Button>
        <Button
          type="submit"
          disabled={
            member.isSubmitted ||
            submitting ||
            projectDetails?.status === "Completed" ||
            projectDetails?.status === "Pending Approval"
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
            `${member.isPrimary ? "Save & Confirm My Details" : "Save & Confirm Member Details"}`
          )}
        </Button>
      </div>
    </form>
  );

  /** Renders a single member card (expandable) */
  const renderMemberCard = (member: ClientMember) => {
    const status = getMemberStatus(member);
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
              projectDetails?.status !== "Pending Approval" &&
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
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Header - CLIENT PORTAL + User Identity Card */}
      <div className="px-5 py-6 border-b border-slate-100 relative">
        <div className="flex justify-between items-center mb-4 pl-1">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Client Portal
          </h2>
          {/* Mobile Close Button */}
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* User Identity Card - Simple & Professional */}
        <div className="flex items-center gap-3 p-1">
          <div className="relative">
            <div className="w-10 h-10 bg-[#166FB5] rounded-full flex items-center justify-center flex-shrink-0 text-white shadow-sm ring-2 ring-white">
              <span className="font-bold text-sm">
                {user?.displayName ? user.displayName.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
              </span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white"></div>
          </div>
          
          <div className="min-w-0 flex-1">
            <div className="font-bold text-slate-800 text-sm truncate">
              {user?.displayName || "Merlito Dayon Jr."}
            </div>
            <div className="text-xs text-slate-500 truncate">
              {user?.email || emailParam || "merlito.dayon@gmail.com"}
            </div>
          </div>
        </div>
      </div>

      {/* Projects Section */}
      <div className="flex-1 overflow-y-auto px-3 py-6">
        <div className="mb-2 px-3 flex items-center justify-between group cursor-pointer" onClick={() => setShowProjectsList(!showProjectsList)}>
          <div className="flex items-center gap-2 text-slate-600 group-hover:text-[#166FB5] transition-colors">
            <FolderOpen className="h-4 w-4" />
            <span className="text-sm font-bold">My Projects</span>
          </div>
          <ChevronDown className={cn("h-3 w-3 text-slate-400 transition-transform", showProjectsList && "rotate-180")} />
        </div>

        {showProjectsList && (
           <div className="space-y-3 mt-3 ml-6">
            {projects.length === 0 ? (
               <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-100 border-dashed mx-2">
                  <p className="text-xs text-slate-400">No projects found</p>
               </div>
            ) : (
              projects.map((project) => {
                if (!project || !project.pid) return null;
                const isSelected = selectedProjectPid === project.pid;
                const isDocsExpanded = expandedProjectDocs.has(project.pid);
                const docs = projectDocuments.get(project.pid);
                const quotationCount = docs?.quotations.length || 0;
                const chargeSlipCount = docs?.chargeSlips.length || 0;
                const sampleFormCount = docs?.sampleForms?.length || 0;
                const serviceReportCount = docs?.serviceReports?.length || 0;
                const officialReceiptCount = docs?.officialReceipts?.length || 0;
                const sampleFormParams = new URLSearchParams();
                if (emailParam) sampleFormParams.set("email", emailParam);
                if (inquiryIdParam) sampleFormParams.set("inquiryId", inquiryIdParam);
                if (project.pid) sampleFormParams.set("pid", project.pid);
                if (project.title) sampleFormParams.set("projectTitle", project.title);
                if (primaryMember?.formData?.name) {
                  sampleFormParams.set("name", primaryMember.formData.name);
                }
                if (primaryMember?.cid) {
                  sampleFormParams.set("clientId", primaryMember.cid);
                }
                const sampleFormBaseHref = `/client/sample-form?${sampleFormParams.toString()}`;
                
                return (
                  <div key={project.pid} className={cn(
                    "rounded-xl border transition-all duration-200 overflow-hidden group",
                    isSelected 
                      ? "bg-blue-50/50 border-[#166FB5] shadow-sm" 
                      : "bg-white border-slate-200 hover:border-blue-200 hover:shadow-sm"
                  )}>
                    {/* Project Header */}
                    <div className="flex items-center bg-white hover:bg-slate-50">
                      {/* Main project content - clickable */}
                      <div 
                        className="flex-1 min-w-0 p-3 cursor-pointer"
                        onClick={() => handleSelectProject(project)}
                      >
                        <div className="flex flex-col gap-1">
                          <p 
                            className="text-sm text-slate-700 font-medium truncate leading-tight"
                            title={project.title || "Untitled Project"}
                          >
                            {project.title || "Untitled Project"}
                          </p>
                          <Badge className={cn(
                            "text-[10px] h-4 px-1.5 rounded-md font-semibold border-0 w-fit",
                            statusColors[project.status] || "bg-slate-100 text-slate-500"
                          )}>
                            {project.status || "Draft"}
                          </Badge>
                        </div>
                      </div>

                      {/* Documents toggle button - Chevron on the right */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleProjectDocs(project);
                        }}
                        className={cn(
                          "flex-shrink-0 px-3 py-4 hover:bg-slate-100 transition-colors border-l border-slate-200 group/chevron h-full",
                          isDocsExpanded && "bg-blue-50"
                        )}
                        title="View documents"
                        aria-label="Toggle documents"
                      >
                        <ChevronRight className={cn(
                          "h-5 w-5 text-[#166FB5] transition-all duration-200 group-hover/chevron:translate-x-0.5",
                          isDocsExpanded && "rotate-90"
                        )} />
                      </button>
                    </div>

                    {/* Documents sub-panel */}
                    {isDocsExpanded && (
                      <div className="bg-slate-50 border-t">
                        {docs?.loading ? (
                          <div className="flex items-center gap-2 px-3 py-3 text-xs text-slate-500">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Loading…</span>
                          </div>
                        ) : (
                          <div className="p-3 pl-6 space-y-3">
                            {/* Quotations */}
                            <div>
                              <div className="flex items-center gap-2 mb-1.5">
                                <FileText className="h-3 w-3 text-purple-600" />
                                <span className="text-sm font-semibold text-slate-700">
                                  Quotations
                                </span>
                                <span className="text-[10px] text-slate-500">({quotationCount})</span>
                              </div>
                              {quotationCount > 0 ? (
                                <div className="space-y-1 ml-5">
                                  {docs?.quotations.map((quotation) => (
                                    <div key={quotation.id} className="flex items-center gap-2">
                                      <a
                                        href={`/client/view-document?type=quotation&ref=${quotation.referenceNumber}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block text-xs text-slate-600 hover:text-purple-600 hover:underline truncate"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        • {quotation.referenceNumber}
                                      </a>
                                      {quotation.selectedForProject && (
                                        <span className="text-green-600 flex items-center justify-center shrink-0 w-4 h-4 rounded-full bg-green-50 border border-green-200">
                                          <CheckCircle2 className="h-3 w-3" />
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400 ml-5">No quotations yet</p>
                              )}
                            </div>

                            {/* Charge Slips */}
                            <div>
                              <div className="flex items-center gap-2 mb-1.5">
                                <Receipt className="h-3 w-3 text-green-600" />
                                <span className="text-sm font-semibold text-slate-700">
                                  Charge Slips
                                </span>
                                <span className="text-[10px] text-slate-500">({chargeSlipCount})</span>
                              </div>
                              {chargeSlipCount > 0 ? (
                                <div className="space-y-2 ml-4">
                                  {docs?.chargeSlips.map((chargeSlip) => {
                                    const csPaid = chargeSlip.status === "paid";
                                    const csCancelled = chargeSlip.status === "cancelled";
                                    const csTotal = typeof chargeSlip.total === "number" ? chargeSlip.total : 0;
                                    const csRawDate = chargeSlip.dateIssued;
                                    const csIssuedDate = csRawDate
                                      ? (csRawDate as any)?.toDate
                                        ? formatDate((csRawDate as any).toDate())
                                        : formatDate(csRawDate as string)
                                      : null;
                                    return (
                                      <div
                                        key={chargeSlip.id}
                                        className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {/* Header — always visible; click anywhere except the CS link to toggle */}
                                        <div
                                          className="flex items-center justify-between gap-2 p-2.5 cursor-pointer select-none hover:bg-slate-50 transition-colors"
                                          onClick={() =>
                                            setExpandedCsIds((prev) => {
                                              const next = new Set(prev);
                                              if (next.has(chargeSlip.id!)) next.delete(chargeSlip.id!);
                                              else next.add(chargeSlip.id!);
                                              return next;
                                            })
                                          }
                                        >
                                          <a
                                            href={`/client/view-document?type=charge-slip&ref=${chargeSlip.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-xs font-semibold text-green-700 hover:underline"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <Receipt className="h-3 w-3 flex-shrink-0" />
                                            {chargeSlip.chargeSlipNumber}
                                          </a>
                                          <div className="flex items-center gap-1.5">
                                            {csPaid ? (
                                              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                                                <CheckCircle2 className="h-2.5 w-2.5" /> Paid
                                              </span>
                                            ) : csCancelled ? (
                                              <span className="inline-flex text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">
                                                Cancelled
                                              </span>
                                            ) : (
                                              <span className="inline-flex text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                                                Processing
                                              </span>
                                            )}
                                            <ChevronDown className={cn("h-3 w-3 text-slate-400 transition-transform", expandedCsIds.has(chargeSlip.id!) && "rotate-180")} />
                                          </div>
                                        </div>

                                        {/* Collapsible body */}
                                        {expandedCsIds.has(chargeSlip.id!) && (
                                          <div className="px-2.5 pb-2.5 space-y-2 border-t border-slate-100">
                                            {/* Detail row: total + date */}
                                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-500 pt-2">
                                              <span>
                                                Total:{" "}
                                                <span className="font-semibold text-slate-800">
                                                  ₱{csTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                              </span>
                                              {csIssuedDate && (
                                                <span>
                                                  Issued: <span className="font-medium text-slate-600">{csIssuedDate}</span>
                                                </span>
                                              )}
                                            </div>

                                            {/* Acknowledged OR entries */}
                                            {(chargeSlip.orEntries?.length ?? 0) > 0 && (
                                              <div className="space-y-0.5">
                                                {chargeSlip.orEntries!.map((entry, idx) => (
                                                  <div key={idx} className="flex items-center gap-1 text-[10px] text-emerald-700">
                                                    <CheckCircle2 className="h-2.5 w-2.5 flex-shrink-0" />
                                                    <span>OR No. {entry.orNumber} · {entry.orDate}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            )}

                                            {/* Per-charge-slip OR receipts — view reference when paid, upload when unpaid */}
                                            {portalFeatures.officialReceipts && (
                                              <UploadReceipt
                                                projectId={project.pid}
                                                hasChargeSlip={true}
                                                chargeSlipNumber={chargeSlip.chargeSlipNumber}
                                                uploadAllowed={!csPaid && !csCancelled}
                                              />
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400 ml-5">No charge slips yet</p>
                              )}
                            </div>

                            {portalFeatures.sampleForms && (
                              <div>
                                <div className="flex items-center gap-2 mb-1.5">
                                  <FileSpreadsheet className="h-3 w-3 text-orange-600" />
                                  <span className="text-sm font-semibold text-slate-700">
                                    Sample Forms
                                  </span>
                                  <span className="text-[10px] text-slate-500">({docs?.sampleForms?.length || 0})</span>
                                </div>
                                <a
                                  href={sampleFormBaseHref}
                                  className="inline-block text-xs text-[#166FB5] hover:underline ml-5 mb-2"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  + Fill out sample submission form
                                </a>
                                {(docs?.sampleForms?.length || 0) > 0 ? (
                                  <div className="space-y-1 ml-5">
                                    {docs?.sampleForms.map((item) => (
                                      <a
                                        key={item.id}
                                        href={`${sampleFormBaseHref}&formId=${item.id}`}
                                        className="block text-xs text-slate-600 hover:text-orange-600 hover:underline truncate"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        • {item.id} ({item.totalNumberOfSamples || 0} samples)
                                      </a>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-400 ml-5">No sample forms yet</p>
                                )}
                              </div>
                            )}

                            {portalFeatures.serviceReports && (
                              <div>
                                <div className="flex items-center gap-2 mb-1.5">
                                  <ShieldEllipsis className="h-3 w-3 text-blue-600" />
                                  <span className="text-sm font-semibold text-slate-700">
                                    Service Reports
                                  </span>
                                  <span className="text-[10px] text-slate-500">({docs?.serviceReports?.length || 0})</span>
                                </div>
                                {(docs?.serviceReports?.length || 0) > 0 ? (
                                  <div className="space-y-1 ml-5">
                                    {docs?.serviceReports.map((item: any) => (
                                      <div
                                        key={item.id}
                                        className="block text-xs text-slate-600 truncate"
                                      >
                                        • {item.name || item.id}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-400 ml-5">No service reports yet</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
           </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100">
        <button
          onClick={() => router.push("/portal")}
          className="w-full flex items-center gap-3 px-4 py-3 text-[#B9273A] bg-red-50 hover:bg-red-100/80 rounded-xl transition-colors group"
        >
          <div className="p-1.5 bg-white rounded-lg shadow-sm group-hover:scale-105 transition-transform">
             <LogOut className="h-4 w-4" />
          </div>
          <span className="font-semibold text-sm">Exit Portal</span>
        </button>
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
      <div className="flex h-[calc(100vh-73px)]">
        {/* ═════ LEFT SIDEBAR — Desktop ═════ */}
        <aside className="hidden lg:flex w-[400px] min-w-[340px] bg-white border-r border-slate-200 flex-shrink-0 flex-col">
          {sidebarContent}
        </aside>

        {/* ═════ LEFT SIDEBAR — Mobile overlay ═════ */}
        {mobileSidebarOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/40 z-40 lg:hidden"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <aside className="fixed left-0 top-0 bottom-0 w-[400px] bg-white z-50 lg:hidden shadow-2xl flex flex-col">
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
                    ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"
                    : projectDetails.status === "Ongoing"
                    ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200"
                    : "bg-gradient-to-r from-red-50 to-pink-50 border-red-200"
                }`}>
                  <div className="flex items-start">
                    <div className="flex-1 space-y-2">
                      {projectDetails.status === "Draft" ? (
                        <>
                          <p className="text-sm font-semibold text-orange-900 leading-none">
                            Action Required: Complete Project Submission
                          </p>
                          <p className="text-sm text-orange-700 leading-relaxed">
                            {members.some(m => m.isPrimary && !m.isSubmitted) ? (
                              <>Please provide your details as the <strong>Primary Member</strong>. </>
                            ) : (
                              <>If you have additional team members, please add them now. </>
                            )}
                            Once finished, scroll to the bottom and click "<strong>Submit Project & Team for Approval</strong>" to send your application for admin review. After approval, you will be assigned a <strong>Project ID</strong> and <strong>Client ID</strong>.
                          </p>
                        </>
                      ) : projectDetails.status === "Pending Approval" ? (
                        <>
                          <p className="text-sm font-semibold text-blue-900 leading-none">
                            Application Submitted & Under Review
                          </p>
                          <p className="text-sm text-blue-700 leading-relaxed">
                            Your project and team details have been successfully submitted. Our team is currently reviewing your application. Please check this portal dashboard for your <strong>Project ID</strong>, <strong>Client ID</strong>, and approval notification. <strong>No further action is required at this time.</strong>
                          </p>
                        </>
                      ) : projectDetails.status === "Ongoing" ? (
                        <>
                          <p className="text-sm font-semibold text-green-900 leading-none">
                            Project Approved
                          </p>
                          <p className="text-sm text-green-700 leading-relaxed">
                            Your project has been approved and is now active. You can now view your unique <strong>Project ID</strong> and <strong>Client IDs</strong>, and access all project documents below.
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
                    {/* Only show Project ID badge for officially approved projects, not drafts (inquiry ID is temporary password) */}
                    {projectDetails.status !== "Draft" && projectDetails.status !== "Pending Approval" && (
                      <Badge
                        variant="outline"
                        className="font-mono text-[10px] bg-blue-50 text-[#166FB5] border-blue-200 px-2 py-0.5"
                      >
                        Project ID: {projectDetails.pid}
                      </Badge>
                    )}
                  </div>
                </div>
                {/* Message widget for project view */}
                {currentInquiry && (
                  <FloatingChatWidget inquiryId={currentInquiry.id} role="client" />
                )}
              </div>

                {/* ── Request Progress Timeline ──────────────────── */}
                {portalFeatures.requestProgressTimeline && (
                  <Card className="border border-slate-100 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            Request Progress
                          </p>
                          <p className="text-xs text-slate-500">
                            Track the current stage of your request from inquiry to delivery.
                          </p>
                        </div>
                        {selectedProjectPid && projectDocuments.get(selectedProjectPid)?.loading && (
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Loading documents</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 space-y-3">
                        {timelineSteps.map((step) => (
                          <div key={step.key} className="flex items-start gap-3">
                            <div className="mt-0.5">
                              {step.state === "complete" ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              ) : step.state === "current" ? (
                                <Clock className="h-4 w-4 text-blue-500" />
                              ) : (
                                <span className="h-4 w-4 rounded-full border border-slate-300 block" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold text-slate-700">
                                  {step.label}
                                </p>
                                {step.state === "current" && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                    In progress
                                  </span>
                                )}
                                {step.state === "complete" && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                                    Completed
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {step.detail}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
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
                      disabled={projectDetails?.status === "Completed" || approvalStatus === "pending" || projectDetails?.status === "Pending Approval"}
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
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 shadow-sm animate-in slide-in-from-top duration-500">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-green-100 rounded-lg flex-shrink-0 border border-green-200">
                          <CheckCircle2 className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-bold text-lg text-green-900 leading-tight">
                              Project & Team Approved
                            </h4>
                          </div>
                          <p className="text-green-800/90 mb-3 text-sm leading-relaxed">
                            Your project and team members have been approved and are now active. 
                            You can now view your unique **Project ID**, **Client IDs**, and access all project documents in this portal.
                          </p>
                          {approvalStatusData.reviewNotes && (
                            <div className="bg-white/50 rounded-lg p-3 mt-2 border border-green-100 italic">
                              <p className="text-xs font-bold text-green-900 mb-1 uppercase tracking-wider not-italic">
                                Administrator Remarks
                              </p>
                              <p className="text-sm text-green-800">
                                "{approvalStatusData.reviewNotes}"
                              </p>
                            </div>
                          )}
                          <div className="mt-4 flex items-center gap-3">
                            <Badge className="bg-green-600 text-white border-0 text-[10px] px-2.5 h-6">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Members Registered
                            </Badge>
                            <Badge className="bg-blue-600 text-white border-0 text-[10px] px-2.5 h-6">
                              Project Active
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowApprovalCelebration(false)}
                          className="text-green-600 hover:text-green-800 hover:bg-green-200/50 -mt-1 -mr-1"
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

                {/* ── Submit for Approval Button ─────────── */}
                {projectDetails?.status !== "Completed" && 
                  projectDetails?.status !== "Pending Approval" && // Hide if main project is pending
                  approvalStatus !== "pending" && 
                  (projectDetails?.isDraft || members.some((m) => m.isDraft && !m.isPrimary)) && (
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
            /* ── Dashboard Overview (no project selected) ─────── */
            <div className="h-full overflow-y-auto bg-slate-50/30 p-4 lg:p-6">
              <div className="max-w-4xl mx-auto space-y-6">
                {/* ── Request Progress Timeline ──────────────────── */}
                {portalFeatures.requestProgressTimeline && (
                  <Card className="border border-slate-100 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            Request Progress
                          </p>
                          <p className="text-xs text-slate-500">
                            Track the current stage of your request from inquiry to delivery.
                          </p>
                        </div>
                        {selectedProjectPid && projectDocuments.get(selectedProjectPid)?.loading && (
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Loading documents</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 overflow-x-auto">
                        <div className="flex items-start gap-6 min-w-max pb-1">
                          {timelineSteps.map((step, index) => (
                            <div key={step.key} className="flex items-center gap-4">
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5">
                                  {step.state === "complete" ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                  ) : step.state === "current" ? (
                                    <Clock className="h-4 w-4 text-blue-500" />
                                  ) : (
                                    <span className="h-4 w-4 rounded-full border border-slate-300 block" />
                                  )}
                                </div>
                                <div className="min-w-[160px]">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-semibold text-slate-700">
                                      {step.label}
                                    </p>
                                    {step.state === "current" && (
                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                        In progress
                                      </span>
                                    )}
                                    {step.state === "complete" && (
                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                                        Completed
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {step.detail}
                                  </p>
                                </div>
                              </div>
                              {index < timelineSteps.length - 1 && (
                                <span className="h-px w-8 bg-slate-200" aria-hidden="true" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Welcome & Status Header */}
                <div className="bg-white rounded-2xl p-5 lg:p-6 shadow-sm border border-slate-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-bl-full -mr-8 -mt-8 opacity-50"></div>
                  <div className="relative">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h2 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-[#166FB5] to-[#4038AF] bg-clip-text text-transparent">
                          Welcome to your Workspace
                        </h2>
                        <p className="text-slate-500 text-sm max-w-md">
                          Review your official quotations and manage your research projects here.
                        </p>
                      </div>
                      
                      {currentInquiry && (
                        <div className="bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 flex items-center gap-3 min-w-[200px]">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center shadow-sm",
                            currentInquiry.status === "Approved Client" ? "bg-green-100 text-green-600" :
                            currentInquiry.status === "Quotation Only" ? "bg-blue-100 text-blue-600" :
                            "bg-amber-100 text-amber-600"
                          )}>
                            <Info className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Inquiry Status</p>
                            <p className="font-bold text-slate-700 text-sm">{currentInquiry.status}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Documents FIRST, then Summary */}
                  <div className="space-y-6">
                    {/* Official Documents (Quotations) - MOVED UP */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                          <FileText className="h-5 w-5 text-indigo-500" />
                          Official Documents
                        </h3>
                        {inquiryQuotations.length > 0 && (
                          <Badge className="bg-indigo-50 text-indigo-600 hover:bg-indigo-50 border-indigo-100">
                            {inquiryQuotations.length} {inquiryQuotations.length === 1 ? 'Quotation' : 'Quotations'}
                          </Badge>
                        )}
                      </div>

                      {loadingQuotations ? (
                        <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-2">
                          <Loader2 className="h-6 w-6 animate-spin" />
                          <p className="text-xs font-medium">Fetching documents...</p>
                        </div>
                      ) : inquiryQuotations.length === 0 ? (
                        <div className="text-center py-8 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                          <p className="text-xs text-slate-500 italic">No official quotations found for this inquiry yet.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {inquiryQuotations.map((quote) => (
                            <div 
                              key={quote.id} 
                              className="group flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white rounded-xl border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all duration-200 gap-3"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100 transition-colors">
                                  <FileText className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-bold text-slate-800 truncate text-sm">
                                      Quotation: {quote.referenceNumber}
                                    </p>
                                    {quote.selectedForProject && (
                                      <Badge title="Selected" className="bg-green-600 hover:bg-green-700 text-white p-1 flex items-center justify-center rounded-full w-5 h-5">
                                        <CheckCircle2 className="w-4 h-4" />
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                    <Calendar className="h-2.5 w-2.5" />
                                    <span>{new Date(quote.dateIssued).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                    <span>•</span>
                                    <span>{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(quote.total)}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col sm:flex-row gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => router.push(`/client/view-document?type=quotation&ref=${quote.referenceNumber}`)}
                                  className="border-indigo-100 text-indigo-600 hover:bg-indigo-50 font-bold h-8 text-xs"
                                >
                                  View PDF
                                </Button>
                                {fetchedApprovedProjects.length === 0 && currentInquiry?.status !== "Cancelled" && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleProceedWithService(quote.referenceNumber)}
                                    className="bg-gradient-to-r from-[#166FB5] to-[#4038AF] text-white hover:opacity-90 font-bold h-8 text-xs"
                                  >
                                    <ArrowRight className="h-3 w-3 mr-1" />
                                    Proceed with Service
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                                          {/* Messages / Communications (Floating) */}
                      {currentInquiry && (
                        <FloatingChatWidget inquiryId={currentInquiry.id} role="client" />
                      )}

                      {/* Quotation Request Details (previously Inquiry Details Summary) */}
                    {currentInquiry && (
                      <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <h4 className="text-sm font-bold text-amber-900">Not proceeding with the service?</h4>
                            <p className="text-xs text-amber-800">
                              If you decide to stop, you can cancel this request. This will update your inquiry status to Cancelled.
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => setShowCancelInquiryModal(true)}
                            disabled={currentInquiry.status === "Cancelled" || cancelInquirySubmitting}
                            className="border-amber-200 text-amber-900 hover:bg-amber-100 font-bold text-xs h-9"
                          >
                            Do Not Proceed
                          </Button>
                        </div>
                        {currentInquiry.status === "Cancelled" && (
                          <p className="text-[11px] text-amber-700 mt-2">This request is already marked as cancelled.</p>
                        )}
                      </div>
                    )}

                    {currentInquiry && (
                      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <div className="w-2.5 h-2.5 bg-gradient-to-r from-[#912ABD] to-[#6E308E] rounded-full"></div>
                            Quotation Request Details
                          </h3>
                        </div>
                        
                        <div className="space-y-6">
                          {/* Laboratory Service Details */}
                          {currentInquiry.serviceType === "laboratory" ? (
                            <div className="space-y-6 animate-in fade-in duration-500">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                {/* Service Type */}
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2">
                                    <FlaskConical className="h-4 w-4 text-slate-400" />
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Service Type</span>
                                  </div>
                                  <Badge className="w-fit capitalize bg-blue-50 text-blue-700 border-blue-100 text-xs px-2.5 py-0.5 font-bold">
                                    Laboratory
                                  </Badge>
                                </div>

                                {/* Species */}
                                <div className="space-y-1.5">
                                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Species</span>
                                  <p className="text-sm font-bold text-slate-900 capitalize italic">
                                    {currentInquiry.species 
                                      ? (currentInquiry.otherSpecies ? `${currentInquiry.species}: ${currentInquiry.otherSpecies}` : currentInquiry.species)
                                      : "—"}
                                  </p>
                                </div>

                                {/* Sample Count */}
                                <div className="space-y-1.5">
                                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Sample Count</span>
                                  <p className="text-sm font-bold text-slate-900">{currentInquiry.sampleCount || "—"}</p>
                                </div>
                              </div>

                              {/* Workflow */}
                              <div className="space-y-2">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Workflow</span>
                                <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 text-sm text-slate-800 font-semibold shadow-inner">
                                  {formatWorkflowType(currentInquiry.workflowType)}
                                </div>
                              </div>

                              {/* Bioinformatics Analysis */}
                              <div className="space-y-2">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Bioinformatics Analysis</span>
                                {currentInquiry.bioinfoOptions && currentInquiry.bioinfoOptions.length > 0 ? (
                                  <div className="flex flex-wrap gap-2 p-1">
                                    {currentInquiry.bioinfoOptions.map((option) => (
                                      <Badge 
                                        key={option} 
                                        variant="secondary" 
                                        className="bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100 transition-colors py-1 px-3 text-[11px] font-bold"
                                      >
                                        {formatBioinfoOption(option)}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-slate-400 px-1 italic">None selected</p>
                                )}
                              </div>

                              {/* Research Overview */}
                              <div className="space-y-2">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Research Overview</span>
                                <div className="p-4 bg-indigo-50/30 rounded-xl border border-indigo-100/30 text-sm text-slate-800 italic leading-relaxed font-medium">
                                  {currentInquiry.researchOverview ? `"${currentInquiry.researchOverview}"` : "—"}
                                </div>
                              </div>

                              {/* Methodology File if exists */}
                              {currentInquiry.methodologyFileUrl && (
                                <div className="flex items-center gap-2 px-1 pt-2">
                                  <FileText className="h-4 w-4 text-blue-500" />
                                  <a 
                                    href={currentInquiry.methodologyFileUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs font-bold text-blue-600 hover:underline"
                                  >
                                    View Methodology File
                                  </a>
                                </div>
                              )}
                            </div>
                          ) : (
                            /* Other Services (Research, Training, Retail, etc.) */
                            <div className="space-y-6 animate-in fade-in duration-500">
                              {/* Top Section: Quick Stats */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                {/* Service Type */}
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2">
                                    <FlaskConical className="h-4 w-4 text-slate-400" />
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Service Type</span>
                                  </div>
                                  <Badge className="w-fit capitalize bg-blue-50 text-blue-700 border-blue-100 text-xs px-2.5 py-0.5 font-bold">
                                    {formatServiceType(currentInquiry.serviceType)}
                                  </Badge>
                                </div>

                                {/* Sample Count */}
                                {currentInquiry.sampleCount && (
                                  <div className="space-y-1.5">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Quantity</span>
                                    <p className="text-sm font-bold text-slate-900">{currentInquiry.sampleCount} samples</p>
                                  </div>
                                )}

                                {/* Retail Sales Details Section */}
                                {currentInquiry.serviceType === 'retail' && currentInquiry.retailItems && currentInquiry.retailItems.length > 0 && (
                                  <div className="pt-4 border-t border-slate-100 space-y-4 sm:col-span-3">
                                    <h3 className="text-sm font-semibold text-slate-700">Retail Sales Details</h3>
                                    <div className="flex flex-col">
                                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Requested Items</span>
                                      <div className="grid grid-cols-1 gap-3 mt-2">
                                        {currentInquiry.retailItems.map((item, idx) => (
                                          <div key={`${item}-${idx}`} className="flex flex-col bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <span className="text-sm font-semibold text-slate-800">{item}</span>
                                            {currentInquiry.retailItemDetails?.[item] && (
                                              <div className="mt-1 flex items-center gap-2">
                                                <span className="text-xs text-slate-500">Amount:</span>
                                                <span className="text-sm text-[#166FB5] font-medium">{currentInquiry.retailItemDetails[item]}</span>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {currentInquiry.serviceType === 'bioinformatics' && (
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Type of Bioinformatics Service</span>
                                    <div className="flex flex-wrap gap-2 p-1">
                                      {(Array.isArray(currentInquiry.bioinformaticsDetails?.serviceTypes) ? currentInquiry.bioinformaticsDetails?.serviceTypes : []).length > 0 ? (
                                        (currentInquiry.bioinformaticsDetails?.serviceTypes as string[]).map((serviceType) => (
                                          <Badge
                                            key={serviceType}
                                            variant="secondary"
                                            className="bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100 transition-colors py-1 px-3 text-[11px] font-bold"
                                          >
                                            {serviceType}
                                          </Badge>
                                        ))
                                      ) : (
                                        <p className="text-sm text-slate-400 px-1 italic">None selected</p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Provide Own Data</span>
                                      <p className="text-sm font-semibold text-slate-800">{currentInquiry.bioinformaticsDetails?.dataProvideOwnData ? "Yes" : "No"}</p>
                                    </div>
                                    <div className="space-y-1">
                                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Data Generated by PGC Visayas</span>
                                      <p className="text-sm font-semibold text-slate-800">{currentInquiry.bioinformaticsDetails?.dataProvidedByPgc ? "Yes" : "No"}</p>
                                    </div>
                                  </div>

                                  {currentInquiry.bioinformaticsDetails?.dataProvideOwnData && (
                                    <div className="space-y-2">
                                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Data Details</span>
                                      <div className="p-3 bg-white rounded-xl border border-slate-100 text-sm text-slate-700 leading-relaxed shadow-sm space-y-1">
                                        <p>File formats: {Array.isArray(currentInquiry.bioinformaticsDetails?.dataFileFormats) && currentInquiry.bioinformaticsDetails?.dataFileFormats.length > 0 ? currentInquiry.bioinformaticsDetails.dataFileFormats.join(', ') : '—'}</p>
                                        {currentInquiry.bioinformaticsDetails?.dataOtherFormat && (
                                          <p>Other format: {currentInquiry.bioinformaticsDetails.dataOtherFormat}</p>
                                        )}
                                        {currentInquiry.bioinformaticsDetails?.dataFileSizePerSample && (
                                          <p>File size per sample: {currentInquiry.bioinformaticsDetails.dataFileSizePerSample}</p>
                                        )}
                                        {currentInquiry.bioinformaticsDetails?.dataTransferMode && (
                                          <p>Preferred transfer mode: {currentInquiry.bioinformaticsDetails.dataTransferMode}</p>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  <div className="space-y-2">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Overview of Research and Objectives</span>
                                    <div className="p-4 bg-indigo-50/30 rounded-xl border border-indigo-100/30 text-sm text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
                                      {currentInquiry.bioinformaticsDetails?.overviewObjectives || "—"}
                                    </div>
                                  </div>

                                  {flattenBioinformaticsDetails(currentInquiry.bioinformaticsDetails).length > 0 && (
                                    <div className="space-y-2">
                                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">All Submitted Bioinformatics Entries</span>
                                      <div className="p-3 bg-white rounded-xl border border-slate-100 text-sm text-slate-700 leading-relaxed shadow-sm">
                                        <ul className="space-y-1 text-xs">
                                          {flattenBioinformaticsDetails(currentInquiry.bioinformaticsDetails).map((entry) => (
                                            <li key={`${entry.key}-${entry.value}`}>
                                              <span className="font-semibold text-slate-600">{entry.key}:</span> {entry.value}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Technical Block */}
                              {(currentInquiry.species || currentInquiry.workflowType) && (
                                <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {currentInquiry.species && (
                                    <div className="space-y-1">
                                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Species / Organism</span>
                                      <p className="text-sm font-semibold text-slate-800 capitalize">
                                        {currentInquiry.otherSpecies 
                                          ? `${currentInquiry.species}: ${currentInquiry.otherSpecies}`
                                          : currentInquiry.species}
                                      </p>
                                    </div>
                                  )}

                                  {currentInquiry.workflowType && (
                                    <div className="space-y-1">
                                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Analysis Strategy</span>
                                      <p className="text-sm font-semibold text-slate-800">
                                        {formatWorkflowType(currentInquiry.workflowType)}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Bioinformatics Options */}
                              {currentInquiry.workflowType === 'complete-bioinfo' && currentInquiry.bioinfoOptions && currentInquiry.bioinfoOptions.length > 0 && (
                                <div className="space-y-2">
                                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Selected Bioinformatics Analysis</span>
                                  <div className="flex flex-wrap gap-2 p-1">
                                    {currentInquiry.bioinfoOptions.map((option) => (
                                      <Badge 
                                        key={option} 
                                        variant="secondary" 
                                        className="bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100 transition-colors py-1 px-3 text-[11px] font-bold"
                                      >
                                        {formatBioinfoOption(option)}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Specific Needs & Assays (Common for all) */}
                          {currentInquiry.individualAssayDetails && (
                            <div className="space-y-2">
                              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Selected Assays</span>
                              <div className="p-3 bg-white rounded-xl border border-slate-100 text-sm text-slate-700 leading-relaxed shadow-sm">
                                {currentInquiry.individualAssayDetails}
                              </div>
                            </div>
                          )}

                          {/* Research Narrative (Only for non-research, non-laboratory services) */}
                          {currentInquiry.serviceType !== "research" && currentInquiry.serviceType !== "laboratory" && currentInquiry.researchOverview && (
                            <div className="space-y-2">
                              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Objectives & Brief Overview</span>
                              <div className="p-4 bg-indigo-50/30 rounded-xl border border-indigo-100/30 text-sm text-slate-800 italic leading-relaxed font-medium">
                                "{currentInquiry.researchOverview}"
                              </div>
                            </div>
                          )}

                          {/* Research & Collaboration Details */}
                          {currentInquiry.serviceType === 'research' && (currentInquiry.researchOverview || currentInquiry.projectBackground || currentInquiry.molecularServicesBudget || currentInquiry.plannedSampleCount) && (
                            <div className="pt-4 border-t border-slate-100 space-y-4">
                              {(currentInquiry.researchOverview || currentInquiry.projectBackground) && (
                                <div className="space-y-2">
                                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Overview of Research, Objectives, and Scope of Collaboration
                                  </span>
                                  <div className="p-3 bg-slate-50/50 rounded-lg text-sm text-slate-700 leading-relaxed border border-slate-100 whitespace-pre-wrap">
                                    {currentInquiry.researchOverview || currentInquiry.projectBackground}
                                  </div>
                                </div>
                              )}

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {currentInquiry.molecularServicesBudget && (
                                  <div className="space-y-1">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Molecular Services Budget</span>
                                    <p className="text-sm font-bold text-slate-800">{currentInquiry.molecularServicesBudget}</p>
                                  </div>
                                )}
                                {currentInquiry.plannedSampleCount && (
                                  <div className="space-y-1">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">How Many Samples Are You Planning to Send?</span>
                                    <p className="text-sm font-bold text-slate-800">{currentInquiry.plannedSampleCount}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Training Details */}
                          {currentInquiry.serviceType === 'training' && ((currentInquiry.trainingPrograms && currentInquiry.trainingPrograms.length > 0) || currentInquiry.specificTrainingNeed || currentInquiry.targetTrainingDate || currentInquiry.numberOfParticipants) && (
                            <div className="pt-4 border-t border-slate-100 space-y-4">
                              {currentInquiry.trainingPrograms && currentInquiry.trainingPrograms.length > 0 && (
                                <div className="space-y-2">
                                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Selected Training Programs
                                  </span>
                                  <div className="grid grid-cols-1 gap-2">
                                    {currentInquiry.trainingPrograms.map((program, index) => (
                                      <div key={`${program}-${index}`} className="text-sm text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                        {program === "others-customized" ? "Others / Customized Training Program" : program}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {currentInquiry.targetTrainingDate && (
                                  <div className="space-y-1">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Requested Date</span>
                                    <p className="text-sm font-bold text-slate-800">
                                      {new Date(currentInquiry.targetTrainingDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                  </div>
                                )}
                                {currentInquiry.numberOfParticipants && (
                                  <div className="space-y-1">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Attendance</span>
                                    <p className="text-sm font-bold text-slate-800">{currentInquiry.numberOfParticipants} pax</p>
                                  </div>
                                )}
                              </div>

                              {currentInquiry.specificTrainingNeed && (
                                <div className="space-y-2">
                                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Others / Customized Training Program Details
                                  </span>
                                  <div className="p-3 bg-slate-50/50 rounded-lg text-sm text-slate-700 leading-relaxed border border-slate-100 whitespace-pre-wrap">
                                    {currentInquiry.specificTrainingNeed}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Attachments Section */}
                          {currentInquiry.methodologyFileUrl && (
                            <div className="flex items-center gap-3 pt-4 border-t border-dashed border-slate-100">
                              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Documentation:</span>
                              <a
                                href={currentInquiry.methodologyFileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors"
                              >
                                <FileText className="h-4 w-4" />
                                View Concept/Methodology
                              </a>
                            </div>
                          )}

                          {/* Submission Footer */}
                          <div className="pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-50">
                            <div className="flex items-center gap-2 text-slate-400">
                              <Calendar className="h-4 w-4" />
                              <span className="text-xs font-medium">Submitted {currentInquiry.createdAt ? new Date(currentInquiry.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : "—"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[#4038AF] font-bold text-xs uppercase tracking-widest bg-indigo-50/50 px-3 py-1 rounded-full border border-indigo-100/50">
                              <Building2 className="h-3.5 w-3.5" />
                              <span className="truncate max-w-[200px]">{currentInquiry.affiliation}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
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
          // Re-enable draft button for this member if it was disabled
          if (pendingMemberId) {
            savingDraftIdsRef.current.delete(pendingMemberId);
          }
          setActiveSavingId(null);
        }}
        loading={submitting}
        title="Confirm Member Information"
        description="Please review the details below to ensure accuracy before saving."
        confirmLabel="Confirm & Save"
        cancelLabel="Edit Details"
        className="max-w-2xl"
      >
        {pendingMemberId &&
          (() => {
            const member = members.find((m) => m.id === pendingMemberId);
            if (!member) return null;
            return (
              <div className="space-y-4">
                {/* Profile Header Card - Compact */}
                <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#166FB5] to-[#4038AF] flex items-center justify-center shadow-md flex-shrink-0">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <div>
                      <h3 className="font-bold text-base text-slate-800 truncate">
                        {member.formData.name || "Unnamed Member"}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{member.formData.email || "No email provided"}</span>
                      </div>
                    </div>
                    {member.isPrimary && (
                      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200 text-[10px] px-2 py-0.5 h-auto self-start sm:self-center">
                        Primary Contact
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Details Grid - 3 Columns for wider layout */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  {/* Affiliation */}
                  <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-1.5 text-slate-400 mb-0.5">
                      <Building2 className="h-3 w-3" />
                      <span className="text-[10px] font-bold uppercase tracking-wide">Affiliation</span>
                    </div>
                    <p className="font-medium text-slate-700 truncate text-xs sm:text-sm" title={member.formData.affiliation}>
                      {member.formData.affiliation || "—"}
                    </p>
                  </div>

                  {/* Designation */}
                  <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-1.5 text-slate-400 mb-0.5">
                      <Briefcase className="h-3 w-3" />
                      <span className="text-[10px] font-bold uppercase tracking-wide">Designation</span>
                    </div>
                    <p className="font-medium text-slate-700 truncate text-xs sm:text-sm" title={member.formData.designation}>
                      {member.formData.designation || "—"}
                    </p>
                  </div>

                  {/* Mobile Number */}
                  <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-1.5 text-slate-400 mb-0.5">
                      <Smartphone className="h-3 w-3" />
                      <span className="text-[10px] font-bold uppercase tracking-wide">Mobile</span>
                    </div>
                    <p className="font-medium text-slate-700 font-mono text-xs sm:text-sm">
                      {member.formData.phoneNumber || "—"}
                    </p>
                  </div>

                  {/* Sex */}
                  <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-1.5 text-slate-400 mb-0.5">
                      <User className="h-3 w-3" />
                      <span className="text-[10px] font-bold uppercase tracking-wide">Sex</span>
                    </div>
                    <p className="font-medium text-slate-700 text-xs sm:text-sm">
                      {member.formData.sex === "M" ? "Male" : member.formData.sex === "F" ? "Female" : member.formData.sex || "—"}
                    </p>
                  </div>

                  {/* Address - Spans 2 cols */}
                  <div className="sm:col-span-2 bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-1.5 text-slate-400 mb-0.5">
                      <MapPin className="h-3 w-3" />
                      <span className="text-[10px] font-bold uppercase tracking-wide">Affiliation Address</span>
                    </div>
                    <p className="font-medium text-slate-700 truncate text-xs sm:text-sm" title={member.formData.affiliationAddress}>
                      {member.formData.affiliationAddress || "—"}
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-100 flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-blue-600 leading-snug">
                    Please ensure all details are correct. This information will be used for official communications.
                  </p>
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
        title="Remove Member"
        description="Are you sure you want to remove this team member from the project?"
        confirmLabel="Remove Member"
        cancelLabel="Cancel"
        className="max-w-xl"
      >
        {memberToDelete &&
          (() => {
            const member = members.find((m) => m.id === memberToDelete);
            if (!member) return null;
            return (
              <div className="space-y-4">
                {/* Profile Header Card - Compact */}
                <div className="flex items-center gap-4 bg-red-50 p-3 rounded-xl border border-red-100">
                  <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shadow-sm flex-shrink-0">
                    <Trash2 className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-base text-slate-800 truncate">
                      {member.formData.name || "Unnamed Member"}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{member.formData.email || "No email provided"}</span>
                    </div>
                  </div>
                </div>

                {/* Warning Message */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                   <p className="text-sm text-slate-600">
                    This will remove <strong>{member.formData.name || "this member"}</strong> from the current list. 
                    {member.isDraft 
                      ? " Since this is a draft, the data will be permanently deleted." 
                      : " If this member has already been submitted, this request will need approval."}
                  </p>
                </div>
              </div>
            );
          })()}
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
            <p className="text-sm text-blue-800 font-bold mb-3 border-b border-blue-100 pb-1">
              Other Member/s:
            </p>
            <div className="space-y-4">
              {members
                .filter((m) => m.isDraft && !m.isPrimary)
                .map((m) => (
                  <div key={m.id} className="text-sm text-blue-700 space-y-1">
                    <div><strong className="text-blue-900">Name:</strong> {m.formData.name || "—"}</div>
                    <div><strong className="text-blue-900">Email:</strong> {m.formData.email || "—"}</div>
                    <div><strong className="text-blue-900">Affiliation:</strong> {m.formData.affiliation || "—"}</div>
                  </div>
                ))}
            </div>
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

          {members.filter((m) => !m.isPrimary && m.isDraft).length > 0 && (
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-lg p-4 space-y-3">
              <p className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1">
                Other Member/s:
              </p>
              <div className="space-y-4">
                {members
                  .filter((m) => !m.isDraft || !m.isPrimary) // Adjusted filter to be more reliable
                  .filter((m) => !m.isPrimary && m.isDraft) // Keeping existing logic for clarity
                  .map((m) => (
                    <div key={m.id} className="space-y-1 text-xs text-slate-700">
                      <div><strong className="text-slate-900">Name:</strong> {m.formData.name || "—"}</div>
                      <div><strong className="text-slate-900">Email:</strong> {m.formData.email || "—"}</div>
                      <div><strong className="text-slate-900">Affiliation:</strong> {m.formData.affiliation || "—"}</div>
                    </div>
                  ))}
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

      {/* Proceed with Service Confirmation Modal */}
      <AlertDialog open={showProceedModal} onOpenChange={setShowProceedModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Proceed with Service?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to proceed with the service using <strong>Quotation: {selectedQuotationRef}</strong>?
              <br /><br />
              You will be redirected to the Project Information Form to create your project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowProceedModal(false);
              setSelectedQuotationRef(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmProceedWithService}>
              Yes, Proceed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Do Not Proceed Confirmation Modal */}
      <AlertDialog open={showCancelInquiryModal} onOpenChange={setShowCancelInquiryModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this request?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark your inquiry as Cancelled. You can optionally add a reason below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason" className="text-xs text-slate-600">Reason (optional)</Label>
            <Textarea
              id="cancel-reason"
              value={cancelInquiryReason}
              onChange={(event) => setCancelInquiryReason(event.target.value)}
              rows={3}
              placeholder="Share any context you want us to keep on file..."
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowCancelInquiryModal(false);
              setCancelInquiryReason("");
            }}>
              Go Back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancelInquiry}
              className="bg-red-600 hover:bg-red-700"
              disabled={cancelInquirySubmitting}
            >
              Yes, Cancel Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}




