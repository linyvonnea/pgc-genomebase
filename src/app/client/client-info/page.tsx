"use client";

// Client Portal with Sidebar Navigation
// Implements draft-based member management with admin approval workflow.

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import { doc, setDoc, serverTimestamp, getDoc, collection, query, where, getDocs, deleteDoc } from "firebase/firestore";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getNextCid } from "@/services/clientService";
import { saveMemberApproval, submitForApproval, getMemberApproval } from "@/services/memberApprovalService";
import { DraftMember, ApprovalStatus } from "@/types/MemberApproval";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import ConfirmationModalLayout from "@/components/modal/ConfirmationModalLayout";
import ClientPortalLayout, { SidebarSection } from "@/components/layout/ClientPortalLayout";
import { useApprovalStatus } from "@/hooks/useApprovalStatus";
import { Plus, X, CheckCircle2, AlertCircle, Loader2, FolderOpen, Calendar, Building2, User, FileText, Users, FileText as FileTextIcon, CreditCard, Save, Trash2, Clock, ShieldCheck, XCircle, Send, PartyPopper, Sparkles } from "lucide-react";

interface ClientMember {
  id: string; // Unique tab identifier
  cid: string; // Firestore client ID (empty for draft members)
  formData: ClientFormData;
  errors: Partial<Record<keyof ClientFormData, string>>;
  isSubmitted: boolean;
  isPrimary: boolean; // First member (logged-in user)
  isDraft?: boolean; // True for members not yet in clients collection
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
}

export default function ClientPortalPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const emailParam = searchParams.get('email');
  const inquiryIdParam = searchParams.get('inquiryId');
  const pidParam = searchParams.get('pid');

  const [activeSection, setActiveSection] = useState<string>("project-overview");
  const [members, setMembers] = useState<ClientMember[]>([]);
  const [projects, setProjects] = useState<ProjectDetails[]>([]);
  const [selectedProjectPid, setSelectedProjectPid] = useState<string | null>(null);
  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(null);
  const [activeMemberTab, setActiveMemberTab] = useState<string>("primary");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus | null>(null);
  const [showSubmitForApprovalModal, setShowSubmitForApprovalModal] = useState(false);
  const [showApprovalCelebration, setShowApprovalCelebration] = useState(false);
  const [previousApprovalStatus, setPreviousApprovalStatus] = useState<ApprovalStatus | null>(null);

  // Real-time listener for approval status changes
  const approvalStatusData = useApprovalStatus(inquiryIdParam, selectedProjectPid);

  // Initialize with primary member on mount
  useEffect(() => {
    async function initializePrimaryMember() {
      if (!emailParam || !inquiryIdParam) {
        console.log("❌ Missing email or inquiryId, redirecting to /portal");
        router.replace('/portal');
        return;
      }

      console.log("🚀 Initializing primary member for:", { emailParam, inquiryIdParam, pidParam });
      setLoading(true);
      try {
        // Check if primary member already exists
        const clientsRef = collection(db, "clients");
        const clientQuery = query(
          clientsRef,
          where("email", "==", emailParam),
          where("inquiryId", "==", inquiryIdParam)
        );
        console.log("📋 Querying for existing client...");
        const clientSnapshot = await getDocs(clientQuery);
        console.log("📊 Query result:", { empty: clientSnapshot.empty, size: clientSnapshot.size });

        let primaryMember: ClientMember;

        if (!clientSnapshot.empty) {
          // Load existing primary member
          const clientDoc = clientSnapshot.docs[0];
          const data = clientDoc.data();
          console.log("✅ Found existing client:", clientDoc.id, data);
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
          console.log("👤 Primary member loaded:", primaryMember);
        } else {
          // Create new primary member
          console.log("🆕 No existing client found, creating new one...");
          const year = new Date().getFullYear();
          console.log("📅 Generating CID for year:", year);
          const newCid = await getNextCid(year);
          console.log("🎫 Generated new CID:", newCid);
          
          primaryMember = {
            id: "primary",
            cid: "pending", // Use placeholder CID for new members
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

          // Primary member stays in local state until saved
          console.log("👤 Primary member initialized in state (not yet in Firestore)");
        }

        // Load additional team members from clients collection (already approved members)
        const allMembersQuery = query(
          clientsRef,
          where("inquiryId", "==", inquiryIdParam)
        );
        const allMembersSnapshot = await getDocs(allMembersQuery);
        console.log("📊 All clients for inquiry:", allMembersSnapshot.size);

        const additionalMembers: ClientMember[] = allMembersSnapshot.docs
          .filter(doc => {
            const email = doc.data().email;
            if (!email) return true;
            const isSelf = email.toLowerCase() === emailParam.toLowerCase();
            const data = doc.data();
            // If it's the primary member but they were previously saved, we already handled them above
            // This filter is for additional (non-primary) members who are already approved
            return !isSelf;
          })
          .map((doc, index) => {
            const data = doc.data();
            return {
              id: `member-${index + 1}`,
              cid: doc.id,
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
        console.log("👥 Approved additional members found:", additionalMembers.length);

        // If we found the primary member in the query but didn't assign them earlier (unlikely due to first query)
        // ensure state is correct.
        
        // Fetch all projects for this inquiry
        console.log("📁 Fetching all projects for inquiry:", inquiryIdParam);
        const projectsRef = collection(db, "projects");
        const projectsQuery = query(projectsRef, where("iid", "==", inquiryIdParam));
        const projectsSnapshot = await getDocs(projectsQuery);
        
        const fetchedProjects: ProjectDetails[] = [];
        const allProjectPids: string[] = [];
        let fetchedProjectDetails: ProjectDetails | null = null;
        
        projectsSnapshot.forEach((projectDoc) => {
          const projectData = projectDoc.data();
          const project: ProjectDetails = {
            pid: projectData.pid || projectDoc.id,
            title: projectData.title || "Untitled Project",
            lead: projectData.lead || "Not specified",
            startDate: projectData.startDate?.toDate?.() || projectData.startDate || new Date(),
            sendingInstitution: projectData.sendingInstitution || "Not specified",
            fundingInstitution: projectData.fundingInstitution || "Not specified",
            status: projectData.status || "Pending",
            inquiryId: projectData.iid || inquiryIdParam || "",
          };
          fetchedProjects.push(project);
          allProjectPids.push(project.pid);
          
          // Set as current project if it matches pidParam or if it's the first one
          if (pidParam && projectData.pid === pidParam) {
            fetchedProjectDetails = project;
          }
        });
        
        // If no pidParam but we have projects, select the first one
        if (!fetchedProjectDetails && fetchedProjects.length > 0) {
          fetchedProjectDetails = fetchedProjects[0];
        }
        
        // Auto-update primary member's PID array ONLY if they exist in clients collection
        if (!clientSnapshot.empty && allProjectPids.length > 0) {
          const clientDoc = clientSnapshot.docs[0];
          const clientData = clientDoc.data();
          const currentPids = Array.isArray(clientData.pid) ? clientData.pid : (clientData.pid ? [clientData.pid] : []);
          
          // Check if any projects are missing from the client's PID array
          const missingPids = allProjectPids.filter(pid => !currentPids.includes(pid));
          
          if (missingPids.length > 0) {
            const updatedPids = [...new Set([...currentPids, ...missingPids])]; // Remove duplicates
            await setDoc(doc(db, "clients", clientDoc.id), {
              pid: updatedPids
            }, { merge: true });
            console.log("🔄 Auto-updated primary member PIDs:", updatedPids);
            toast.info(`Linked ${missingPids.length} additional project(s) to your profile`);
          }
        }
        
        setProjects(fetchedProjects);
        if (fetchedProjectDetails) {
          setSelectedProjectPid(fetchedProjectDetails.pid);
          setProjectDetails(fetchedProjectDetails);
          console.log("✅ Projects loaded:", fetchedProjects.length, "Selected:", fetchedProjectDetails.pid);
        } else {
          console.log("ℹ️ No projects found for inquiry:", inquiryIdParam);
        }

        // Load draft/pending members from memberApprovals collection
        let draftMembers: ClientMember[] = [];
        const selectedPid = fetchedProjectDetails?.pid || pidParam || "";
        if (selectedPid && inquiryIdParam) {
          const approval = await getMemberApproval(inquiryIdParam, selectedPid);
          if (approval) {
            setApprovalStatus(approval.status);
            console.log("📋 Approval status for project:", approval.status);
            
            // If approval is draft or pending or rejected, load members from approval
            if (approval.status === "draft" || approval.status === "pending" || approval.status === "rejected") {
              draftMembers = approval.members
                .filter(m => !m.isPrimary)
                .map((m, index) => ({
                  id: m.tempId || `draft-${index + 1}`,
                  cid: "", // No CID yet
                  formData: m.formData,
                  errors: {},
                  isSubmitted: m.isValidated,
                  isPrimary: false,
                  isDraft: true,
                }));
              console.log("📝 Draft members loaded:", draftMembers.length);
            }
          }
        }

        const allMembers = [primaryMember!, ...additionalMembers, ...draftMembers];
        console.log("👥 Setting members array:", allMembers.length, "members");
        console.log("📋 Members:", allMembers);
        setMembers(allMembers);
        // Set active section to project-overview if project exists, otherwise team-members
        const initialSection = fetchedProjectDetails ? "project-overview" : "team-members";
        setActiveSection(initialSection);
        setActiveMemberTab("primary");
        console.log("✅ Initialization complete. Active section set to:", initialSection);
      } catch (error) {
        console.error("❌ Error initializing form:", error);
        toast.error(`Failed to load member data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    }

    initializePrimaryMember();
  }, [emailParam, inquiryIdParam, pidParam, router]);

  // Watch for approval status changes and trigger celebration
  useEffect(() => {
    if (!approvalStatusData.status) return;

    // Update local approval status
    setApprovalStatus(approvalStatusData.status);

    // Detect transition to "approved" status
    if (
      approvalStatusData.status === "approved" &&
      previousApprovalStatus !== "approved" &&
      previousApprovalStatus !== null
    ) {
      // Show celebration notification
      setShowApprovalCelebration(true);
      
      // Show toast notification
      toast.success(
        `🎉 Congratulations! Your team members have been approved and registered!`,
        { duration: 5000 }
      );

      // Reload members to get the newly assigned CIDs
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
            
            const reloadedMembers: ClientMember[] = allMembersSnapshot.docs.map((doc, index) => {
              const data = doc.data();
              const isPrimary = data.email?.toLowerCase() === emailParam.toLowerCase();
              return {
                id: isPrimary ? "primary" : `member-${index + 1}`,
                cid: doc.id,
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
            console.log("✅ Members reloaded after approval:", reloadedMembers.length);
          } catch (error) {
            console.error("Error reloading members:", error);
          }
        };
        reloadMembers();
      }

      // Auto-hide celebration banner after 10 seconds
      setTimeout(() => {
        setShowApprovalCelebration(false);
      }, 10000);
    }

    // Update previous status for next comparison
    setPreviousApprovalStatus(approvalStatusData.status);
  }, [approvalStatusData, previousApprovalStatus, selectedProjectPid, inquiryIdParam, emailParam]);

  const handleAddMember = () => {
    console.log("➕ Add Member button clicked");
    
    if (!selectedProjectPid) {
      toast.error("Please select a project first");
      return;
    }

    // Don't allow adding members if approval is pending
    if (approvalStatus === "pending") {
      toast.error("Cannot add members while approval is pending");
      return;
    }
    
    const newMemberId = `draft-${Date.now()}`;
    console.log("🆔 New draft member ID:", newMemberId);

    const newMember: ClientMember = {
      id: newMemberId,
      cid: "", // No CID yet — assigned on admin approval
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

    const updatedMembers = [...members, newMember];
    console.log("👥 Updated members array:", updatedMembers.length, "members");
    setMembers(updatedMembers);
    setActiveMemberTab(newMemberId);
    console.log("✅ New draft member added locally. Active tab:", newMemberId);
    toast.success("New member added as draft");
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

    const member = members.find(m => m.id === memberToDelete);
    if (!member) return;

    try {
      if (member.isDraft) {
        // Draft member — just remove from local state, no Firestore delete
        console.log("🗑️ Removing draft member locally:", member.id);
      } else if (member.cid) {
        // Approved member with CID — delete from Firestore
        console.log("🗑️ Deleting client document:", member.cid);
        await deleteDoc(doc(db, "clients", member.cid));
        console.log("✅ Client document deleted successfully");
      }
      
      // Remove from local state
      const updatedMembers = members.filter(m => m.id !== memberToDelete);
      setMembers(updatedMembers);
      
      // If draft member was removed, also update the memberApprovals doc
      if (member.isDraft && selectedProjectPid && inquiryIdParam) {
        const remainingDrafts = updatedMembers.filter(m => m.isDraft && !m.isPrimary);
        if (remainingDrafts.length > 0) {
          await saveMemberApproval({
            inquiryId: inquiryIdParam,
            projectPid: selectedProjectPid,
            projectTitle: projectDetails?.title || "",
            submittedBy: emailParam || "",
            submittedByName: members.find(m => m.isPrimary)?.formData.name || "",
            status: approvalStatus === "rejected" ? "draft" : (approvalStatus || "draft"),
            members: remainingDrafts.map(m => ({
              tempId: m.id,
              isPrimary: false,
              isValidated: m.isSubmitted,
              formData: m.formData,
            })),
          });
        }
      }
      
      // Switch to primary member if deleting active member
      if (activeMemberTab === memberToDelete) {
        setActiveMemberTab("primary");
      }

      toast.success(member.isDraft ? "Draft member removed" : "Member removed and deleted from database");
    } catch (error) {
      console.error("❌ Error removing member:", error);
      toast.error("Failed to remove member");
    } finally {
      setShowDeleteModal(false);
      setMemberToDelete(null);
    }
  };

  const handleChange = (memberId: string, field: keyof ClientFormData, value: string) => {
    setMembers(members.map(member => {
      if (member.id === memberId) {
        return {
          ...member,
          formData: { ...member.formData, [field]: value },
        };
      }
      return member;
    }));
  };

  const handleSubmitMember = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    const result = clientFormSchema.safeParse(member.formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ClientFormData, string>> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof ClientFormData;
        fieldErrors[field] = err.message;
      });
      
      setMembers(members.map(m => 
        m.id === memberId ? { ...m, errors: fieldErrors } : m
      ));
      toast.error("Please fix validation errors");
    } else {
      setMembers(members.map(m => 
        m.id === memberId ? { ...m, errors: {} } : m
      ));
      setPendingMemberId(memberId);
      setShowConfirmModal(true);
    }
  };

  const handleConfirmSave = async () => {
    if (!pendingMemberId) return;

    const member = members.find(m => m.id === pendingMemberId);
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

      if (member.isPrimary) {
        // Primary member saves directly to clients collection
        let pids: string[] = projects.map(p => p.pid);
        if (pids.length === 0 && pidParam) pids = [pidParam];

        let cidToUse = member.cid;
        if (cidToUse === "pending") {
          const year = new Date().getFullYear();
          cidToUse = await getNextCid(year);
          console.log("🎫 Generated CID for first-time save:", cidToUse);
        }

        await setDoc(doc(db, "clients", cidToUse), {
          ...result.data,
          cid: cidToUse,
          pid: pids,
          inquiryId: inquiryIdParam,
          isContactPerson: true,
          haveSubmitted: true,
          updatedAt: serverTimestamp(),
        }, { merge: true });

        // Update project's clientNames array
        const currentPid = selectedProjectPid || pidParam;
        if (currentPid) {
          const projectDocRef = doc(db, "projects", currentPid);
          const projectSnap = await getDoc(projectDocRef);
          if (projectSnap.exists()) {
            const clientNames = projectSnap.data().clientNames || [];
            if (!clientNames.includes(result.data.name)) {
              await setDoc(projectDocRef, { 
                clientNames: [...clientNames, result.data.name] 
              }, { merge: true });
            }
          }
        }

        setMembers(members.map(m => 
          m.id === pendingMemberId ? { ...m, cid: cidToUse, isSubmitted: true } : m
        ));
        toast.success("Your information saved successfully!");
      } else {
        // Non-primary (draft) member — save to memberApprovals, NOT clients
        const updatedMembers = members.map(m => 
          m.id === pendingMemberId ? { ...m, isSubmitted: true, errors: {} } : m
        );
        setMembers(updatedMembers);

        // Persist all draft members to memberApprovals
        if (selectedProjectPid && inquiryIdParam) {
          const draftMembers = updatedMembers.filter(m => m.isDraft && !m.isPrimary);
          await saveMemberApproval({
            inquiryId: inquiryIdParam,
            projectPid: selectedProjectPid,
            projectTitle: projectDetails?.title || "",
            submittedBy: emailParam || "",
            submittedByName: members.find(m => m.isPrimary)?.formData.name || "",
            status: approvalStatus === "rejected" ? "draft" : (approvalStatus || "draft"),
            members: draftMembers.map(m => ({
              tempId: m.id,
              isPrimary: false,
              isValidated: m.isSubmitted,
              formData: m.formData,
            })),
          });
        }

        toast.success("Member information validated and saved as draft!");
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
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    setSubmitting(true);

    try {
      if (member.isPrimary) {
        // Primary member saves draft directly to clients collection
        let pids: string[] = projects.map(p => p.pid);
        if (pids.length === 0 && pidParam) pids = [pidParam];

        let cidToUse = member.cid;
        if (cidToUse === "pending") {
          const year = new Date().getFullYear();
          cidToUse = await getNextCid(year);
          console.log("🎫 Generated CID for first-time draft save:", cidToUse);
        }

        await setDoc(doc(db, "clients", cidToUse), {
          ...member.formData,
          cid: cidToUse,
          pid: pids,
          inquiryId: inquiryIdParam,
          isContactPerson: true,
          haveSubmitted: false,
          updatedAt: serverTimestamp(),
        }, { merge: true });

        setMembers(members.map(m => 
          m.id === memberId ? { ...m, cid: cidToUse } : m
        ));

        toast.success("Draft saved for your information");
      } else {
        // Non-primary (draft) member — save to memberApprovals
        if (selectedProjectPid && inquiryIdParam) {
          const draftMembers = members.filter(m => m.isDraft && !m.isPrimary);
          await saveMemberApproval({
            inquiryId: inquiryIdParam,
            projectPid: selectedProjectPid,
            projectTitle: projectDetails?.title || "",
            submittedBy: emailParam || "",
            submittedByName: members.find(m => m.isPrimary)?.formData.name || "",
            status: approvalStatus === "rejected" ? "draft" : (approvalStatus || "draft"),
            members: draftMembers.map(m => ({
              tempId: m.id,
              isPrimary: false,
              isValidated: m.isSubmitted,
              formData: m.formData,
            })),
          });
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

  const handleFinalSubmit = () => {
    // Primary must be saved
    const primary = members.find(m => m.isPrimary);
    if (primary && !primary.isSubmitted) {
      toast.error("Please save your (primary member) information first");
      return;
    }

    // All draft members must be validated
    const draftMembers = members.filter(m => m.isDraft && !m.isPrimary);
    if (draftMembers.length === 0) {
      toast.error("Please add at least one team member");
      return;
    }

    const allDraftsValidated = draftMembers.every(m => m.isSubmitted);
    if (!allDraftsValidated) {
      toast.error("Please save all member information before submitting for approval");
      return;
    }

    // Show the submit for approval confirmation modal
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

      const draftMembers = members.filter(m => m.isDraft && !m.isPrimary);
      
      await submitForApproval(
        inquiryIdParam,
        selectedProjectPid,
        projectDetails?.title || "",
        emailParam || "",
        members.find(m => m.isPrimary)?.formData.name || "",
        draftMembers.map(m => ({
          tempId: m.id,
          isPrimary: false,
          isValidated: true,
          formData: m.formData,
        }))
      );

      setApprovalStatus("pending");
      toast.success("Team members submitted for admin approval! You will be notified once reviewed.");
    } catch (error) {
      console.error("Submit for approval error:", error);
      toast.error("Failed to submit for approval");
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate section statuses for sidebar
  const getSections = (): SidebarSection[] => {
    const teamComplete = members.every(m => m.isSubmitted);
    const teamCount = members.filter(m => m.isSubmitted).length;
    
    return [
      {
        id: "project-overview",
        label: "Project Overview",
        icon: FolderOpen,
        status: projectDetails ? "complete" : "active",
        badge: projectDetails ? undefined : "Not available",
      },
      {
        id: "team-members",
        label: "Team Members",
        icon: Users,
        status: teamComplete ? "complete" : "incomplete",
        badge: `${teamCount}/${members.length} saved`,
      },
      {
        id: "quotations",
        label: "Quotations",
        icon: FileTextIcon,
        status: "locked",
        badge: "Coming soon",
        locked: true,
      },
      {
        id: "charge-slips",
        label: "Charge Slips",
        icon: CreditCard,
        status: "locked",
        badge: "Coming soon",
        locked: true,
      },
    ];
  };

  const getMemberStatus = (member: ClientMember) => {
    if (member.isDraft && approvalStatus === "pending") {
      return { label: "Pending Approval", color: "bg-orange-500", icon: Clock };
    }
    if (member.isDraft && approvalStatus === "rejected") {
      return { label: "Rejected", color: "bg-red-500", icon: XCircle };
    }
    if (member.isSubmitted) {
      return { label: member.isDraft ? "Validated" : "Completed", color: member.isDraft ? "bg-blue-500" : "bg-green-500", icon: CheckCircle2 };
    }
    if (Object.keys(member.errors).length > 0) {
      return { label: "Error", color: "bg-red-500", icon: AlertCircle };
    }
    return { label: "Draft", color: "bg-yellow-500", icon: Loader2 };
  };

  const getTabLabel = (member: ClientMember) => {
    if (member.isPrimary) {
      return member.formData.name || "Primary Member";
    }
    return member.formData.name || `Team Member ${members.indexOf(member)}`;
  };

  // Handle project selection and load its members
  const handleSelectProject = async (project: ProjectDetails) => {
    console.log("🎯 Selecting project:", project.pid);
    setSelectedProjectPid(project.pid);
    setProjectDetails(project);
    
    // Load members for this project
    try {
      const clientsRef = collection(db, "clients");
      // Load primary member
      const primaryQuery = query(
        clientsRef,
        where("email", "==", emailParam),
        where("inquiryId", "==", inquiryIdParam)
      );
      const primarySnapshot = await getDocs(primaryQuery);
      
      let primaryMember: ClientMember | null = null;
      if (!primarySnapshot.empty) {
        const clientDoc = primarySnapshot.docs[0];
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
      }
      
      // Load additional members for this project
      const allMembersQuery = query(
        clientsRef,
        where("inquiryId", "==", inquiryIdParam),
        where("pid", "==", project.pid)
      );
      const allMembersSnapshot = await getDocs(allMembersQuery);
      
      const additionalMembers: ClientMember[] = allMembersSnapshot.docs
        .filter(doc => {
          const email = doc.data().email;
          if (!email) return true;
          return email.toLowerCase() !== emailParam!.toLowerCase();
        })
        .map((doc, index) => {
          const data = doc.data();
          return {
            id: `member-${index + 1}`,
            cid: doc.id,
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
      
      // Load draft/pending members from memberApprovals
      let draftMembers: ClientMember[] = [];
      if (inquiryIdParam) {
        const approval = await getMemberApproval(inquiryIdParam, project.pid);
        if (approval) {
          setApprovalStatus(approval.status);
          if (approval.status === "draft" || approval.status === "pending" || approval.status === "rejected") {
            draftMembers = approval.members
              .filter(m => !m.isPrimary)
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

      const projectMembers = primaryMember 
        ? [primaryMember, ...additionalMembers, ...draftMembers] 
        : [...additionalMembers, ...draftMembers];
      setMembers(projectMembers);
      setActiveMemberTab("primary");
      setActiveSection("team-members");
      toast.success(`Switched to project: ${project.title}`);
      console.log("✅ Loaded members for project:", project.pid, "Count:", projectMembers.length);
    } catch (error) {
      console.error("❌ Error loading project members:", error);
      toast.error("Failed to load project members");
    }
  };

  // Navigate to create new project
  const handleCreateNewProject = () => {
    const params = new URLSearchParams({
      email: emailParam!,
      inquiryId: inquiryIdParam!,
      new: "true"
    });
    router.push(`/client/project-info?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50/50 to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#166FB5] mb-2" />
          <p className="text-slate-600">Loading portal...</p>
        </div>
      </div>
    );
  }

  if (!emailParam || !inquiryIdParam) {
    return null;
  }

  // Safety check: If members array is empty after loading, show error
  if (!loading && members.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50/50 to-blue-50/30 flex items-center justify-center p-6">
        <div className="max-w-md bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Unable to Load Portal</h2>
          <p className="text-slate-600 mb-4">
            Failed to initialize. Please check browser console.
          </p>
          <Button
            onClick={() => router.push('/portal')}
            className="bg-[#166FB5] hover:bg-[#166FB5]/90"
          >
            Return to Verification
          </Button>
        </div>
      </div>
    );
  }

  console.log("🎨 Rendering portal with members:", members);

  // Render function for Project Overview section
  const renderProjectOverview = () => {
    return (
      <div className="space-y-6">
        {/* Header with Project Count */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">My Projects</h2>
            <p className="text-sm text-slate-600 mt-1">
              Manage your projects and team members
            </p>
          </div>
          <Button
            onClick={handleCreateNewProject}
            className="bg-gradient-to-r from-[#166FB5] to-blue-600 hover:from-[#166FB5]/90 hover:to-blue-600/90 text-white shadow-lg"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <Card className="border-2 border-dashed border-slate-300">
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="p-4 bg-slate-100 rounded-full">
                  <FolderOpen className="h-12 w-12 text-slate-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-700 mb-2">No Projects Yet</h3>
                  <p className="text-slate-500 max-w-md">
                    Get started by creating your first project. Click the "New Project" button above.
                  </p>
                </div>
                <Button
                  onClick={handleCreateNewProject}
                  className="mt-4 bg-[#166FB5] hover:bg-[#166FB5]/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Project
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              const isSelected = selectedProjectPid === project.pid;
              const statusColors: Record<string, string> = {
                "Pending": "bg-blue-100 text-blue-700 border-blue-200",
                "Ongoing": "bg-green-100 text-green-700 border-green-200",
                "Completed": "bg-gray-100 text-gray-700 border-gray-200",
                "Cancelled": "bg-red-100 text-red-700 border-red-200",
              };
              const statusColor = statusColors[project.status] || "bg-slate-100 text-slate-700 border-slate-200";
              
              return (
                <Card
                  key={project.pid}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-xl group relative overflow-hidden ${
                    isSelected 
                      ? 'ring-2 ring-[#166FB5] shadow-lg' 
                      : 'hover:ring-1 hover:ring-slate-300'
                  }`}
                  onClick={() => handleSelectProject(project)}
                >
                  {/* Selected Indicator */}
                  {isSelected && (
                    <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
                      <div className="absolute top-2 right-2 transform rotate-45 translate-x-6 -translate-y-6 w-20 h-20 bg-[#166FB5]"></div>
                      <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-white z-10" />
                    </div>
                  )}
                  
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <CardTitle className="text-lg font-bold text-slate-800 line-clamp-2 group-hover:text-[#166FB5] transition-colors">
                        {project.title}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${statusColor} border text-xs font-medium`}>
                        {project.status}
                      </Badge>
                      <span className="text-xs text-slate-500 font-mono">
                        {project.pid}
                      </span>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    {/* Project Lead */}
                    <div className="flex items-center gap-2 text-sm">
                      <div className="p-1.5 bg-blue-50 rounded">
                        <User className="h-3.5 w-3.5 text-[#166FB5]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500">Lead</p>
                        <p className="text-sm font-medium text-slate-700 truncate">
                          {project.lead}
                        </p>
                      </div>
                    </div>
                    
                    {/* Start Date */}
                    <div className="flex items-center gap-2 text-sm">
                      <div className="p-1.5 bg-purple-50 rounded">
                        <Calendar className="h-3.5 w-3.5 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500">Start Date</p>
                        <p className="text-sm font-medium text-slate-700">
                          {typeof project.startDate === 'string' 
                            ? new Date(project.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : project.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    
                    {/* Institutions */}
                    <div className="pt-2 border-t border-slate-100">
                      <div className="flex items-start gap-2 text-xs">
                        <Building2 className="h-3.5 w-3.5 text-orange-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-500">Sending: <span className="text-slate-700 font-medium">{project.sendingInstitution}</span></p>
                          <p className="text-slate-500 mt-1">Funding: <span className="text-slate-700 font-medium">{project.fundingInstitution}</span></p>
                        </div>
                      </div>
                    </div>
                    
                    {/* View Members CTA */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-3 border-[#166FB5] text-[#166FB5] hover:bg-[#166FB5] hover:text-white transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectProject(project);
                      }}
                    >
                      <Users className="h-3.5 w-3.5 mr-1.5" />
                      View Team Members
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        
        {/* Information Banner */}
        {projects.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FolderOpen className="h-5 w-5 text-[#166FB5]" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-800 mb-1">Managing Multiple Projects</h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Click on any project card to view and manage its team members. Each project maintains its own separate team roster.
                  {selectedProjectPid && (
                    <span className="block mt-2 text-[#166FB5] font-medium">
                      Currently viewing: {projects.find(p => p.pid === selectedProjectPid)?.title}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render function for individual member form
  const renderMemberForm = (member: typeof members[0]) => {
    return (
      <form onSubmit={(e) => {
        e.preventDefault();
        handleSubmitMember(member.id);
      }} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name Field */}
          <div className="md:col-span-2">
            <Label className="text-sm font-semibold text-slate-700 mb-2 block">
              Full Name <span className="text-[#B9273A]">*</span>
            </Label>
            <Input
              value={member.formData.name}
              onChange={(e) => handleChange(member.id, "name", e.target.value)}
              placeholder="Enter full name"
              disabled={member.isSubmitted || projectDetails?.status === "Completed"}
              className="bg-white/70 border-slate-200 focus:border-[#166FB5] focus:ring-[#166FB5]/20 h-12 disabled:opacity-70"
            />
            {member.errors.name && (
              <p className="text-[#B9273A] text-sm mt-1 flex items-center gap-1">
                <span className="w-1 h-1 bg-[#B9273A] rounded-full"></span>
                {member.errors.name}
              </p>
            )}
          </div>

          {/* Email Field */}
          <div className="md:col-span-2">
            <Label className="text-sm font-semibold text-slate-700 mb-2 block">
              Email Address <span className="text-[#B9273A]">*</span>
              {member.isPrimary && (
                <span className="ml-2 text-xs font-normal text-slate-500">(Verified - Locked)</span>
              )}
            </Label>
            <Input
              value={member.formData.email}
              onChange={(e) => handleChange(member.id, "email", e.target.value)}
              placeholder={member.isPrimary ? "Your verified email" : "Enter team member email"}
              disabled={member.isPrimary || member.isSubmitted || projectDetails?.status === "Completed"}
              className="bg-white/70 border-slate-200 focus:border-[#166FB5] focus:ring-[#166FB5]/20 h-12 disabled:bg-slate-50 disabled:opacity-70"
            />
            {member.errors.email && (
              <p className="text-[#B9273A] text-sm mt-1 flex items-center gap-1">
                <span className="w-1 h-1 bg-[#B9273A] rounded-full"></span>
                {member.errors.email}
              </p>
            )}
          </div>

          {/* Affiliation Field */}
          <div className="md:col-span-2">
            <Label className="text-sm font-semibold text-slate-700 mb-2 block">
              Affiliation (Department & Institution) <span className="text-[#B9273A]">*</span>
            </Label>
            <Input
              value={member.formData.affiliation}
              onChange={(e) => handleChange(member.id, "affiliation", e.target.value)}
              placeholder="e.g. Division of Biological Sciences - UPV CAS"
              disabled={member.isSubmitted || projectDetails?.status === "Completed"}
              className="bg-white/70 border-slate-200 focus:border-[#166FB5] focus:ring-[#166FB5]/20 h-12 disabled:opacity-70"
            />
            {member.errors.affiliation && (
              <p className="text-[#B9273A] text-sm mt-1 flex items-center gap-1">
                <span className="w-1 h-1 bg-[#B9273A] rounded-full"></span>
                {member.errors.affiliation}
              </p>
            )}
          </div>

          {/* Designation Field */}
          <div>
            <Label className="text-sm font-semibold text-slate-700 mb-2 block">
              Designation <span className="text-[#B9273A]">*</span>
            </Label>
            <Input
              value={member.formData.designation}
              onChange={(e) => handleChange(member.id, "designation", e.target.value)}
              placeholder="e.g. Research Assistant, Professor"
              disabled={member.isSubmitted || projectDetails?.status === "Completed"}
              className="bg-white/70 border-slate-200 focus:border-[#166FB5] focus:ring-[#166FB5]/20 h-12 disabled:opacity-70"
            />
            {member.errors.designation && (
              <p className="text-[#B9273A] text-sm mt-1 flex items-center gap-1">
                <span className="w-1 h-1 bg-[#B9273A] rounded-full"></span>
                {member.errors.designation}
              </p>
            )}
          </div>

          {/* Sex Field */}
          <div>
            <Label className="text-sm font-semibold text-slate-700 mb-2 block">
              Assigned sex at birth <span className="text-[#B9273A]">*</span>
            </Label>
            <Select 
              value={member.formData.sex} 
              onValueChange={(val) => handleChange(member.id, "sex", val)}
              disabled={member.isSubmitted || projectDetails?.status === "Completed"}
            >
              <SelectTrigger className="bg-white/70 border-slate-200 focus:border-[#166FB5] focus:ring-[#166FB5]/20 h-12 disabled:opacity-70">
                <SelectValue placeholder="Select sex" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Male</SelectItem>
                <SelectItem value="F">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Phone Number Field */}
          <div className="md:col-span-2">
            <Label className="text-sm font-semibold text-slate-700 mb-2 block">
              Mobile Number <span className="text-[#B9273A]">*</span>
            </Label>
            <Input
              value={member.formData.phoneNumber}
              onChange={(e) => handleChange(member.id, "phoneNumber", e.target.value)}
              placeholder="e.g. 09091234567"
              disabled={member.isSubmitted || projectDetails?.status === "Completed"}
              className="bg-white/70 border-slate-200 focus:border-[#166FB5] focus:ring-[#166FB5]/20 h-12 disabled:opacity-70"
            />
            {member.errors.phoneNumber && (
              <p className="text-[#B9273A] text-sm mt-1 flex items-center gap-1">
                <span className="w-1 h-1 bg-[#B9273A] rounded-full"></span>
                {member.errors.phoneNumber}
              </p>
            )}
          </div>

          {/* Affiliation Address Field */}
          <div className="md:col-span-2">
            <Label className="text-sm font-semibold text-slate-700 mb-2 block">
              Affiliation Address <span className="text-[#B9273A]">*</span>
            </Label>
            <Textarea
              value={member.formData.affiliationAddress}
              onChange={(e) => handleChange(member.id, "affiliationAddress", e.target.value)}
              placeholder="Enter complete address of your institution/organization"
              disabled={member.isSubmitted || projectDetails?.status === "Completed"}
              className="bg-white/70 border-slate-200 focus:border-[#166FB5] focus:ring-[#166FB5]/20 min-h-[100px] resize-none disabled:opacity-70"
            />
            {member.errors.affiliationAddress && (
              <p className="text-[#B9273A] text-sm mt-1 flex items-center gap-1">
                <span className="w-1 h-1 bg-[#B9273A] rounded-full"></span>
                {member.errors.affiliationAddress}
              </p>
            )}
          </div>
        </div>

        {/* Submit Button for Individual Member */}
        <div className="flex justify-between pt-6 border-t border-slate-100">
          <Button 
            type="button" 
            onClick={() => handleSaveDraft(member.id)}
            disabled={member.isSubmitted || submitting || projectDetails?.status === "Completed"}
            variant="outline"
            className="h-12 px-8 border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold transition-all duration-300 disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button 
            type="submit" 
            disabled={member.isSubmitted || submitting || projectDetails?.status === "Completed"}
            className="h-12 px-8 bg-gradient-to-r from-[#166FB5] to-[#4038AF] hover:from-[#166FB5]/90 hover:to-[#4038AF]/90 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
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
              `Save ${member.isPrimary ? 'Your' : 'Member'} Information`
            )}
          </Button>
        </div>
      </form>
    );
  };

  // Render function for Team Members section
  const renderTeamMembers = () => {
    return (
      <div className="space-y-6">
        {/* Project Context Header */}
        {projectDetails && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#166FB5] rounded-lg">
                  <FolderOpen className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{projectDetails.title}</h3>
                  <p className="text-sm text-slate-600">
                    Team Members • <span className="font-mono font-semibold text-[#166FB5]">{projectDetails.pid}</span>
                  </p>
                </div>
              </div>
              <Badge className="bg-white/80 text-slate-700 border border-slate-200 shadow-sm">
                {projectDetails.status}
              </Badge>
            </div>
          </div>
        )}
        
        {/* Instructions Card */}
        <Card>
          <CardContent className="p-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
              <p className="text-slate-700 leading-relaxed">
                {projectDetails ? (
                  <>
                    Please provide the details for each member of your project team using the tabs below. 
                    The <strong>Primary Member</strong> is the person authorized to manage this project. 
                    Click <strong>+ Add Member</strong> to include additional personnel.
                  </>
                ) : (
                  <>
                    Select a project from the <strong>Project Overview</strong> section to manage its team members.
                  </>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Member Count and Add Button */}
        {projectDetails && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-sm px-4 py-2">
                <Users className="h-4 w-4 mr-2" />
                {members.length} {members.length === 1 ? 'Member' : 'Members'}
              </Badge>
              <span className="text-sm text-slate-600">
                <strong>{members.filter(m => m.isSubmitted).length}</strong> of <strong>{members.length}</strong> saved
              </span>
            </div>
            <Button
              onClick={handleAddMember}
              variant="outline"
              size="sm"
              disabled={projectDetails?.status === "Completed"}
              className="border-[#166FB5] text-[#166FB5] hover:bg-[#166FB5] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Member
            </Button>
          </div>
        )}

        {/* Member Tabs navigation */}
        {projectDetails ? (
          <>
            <Tabs 
              value={activeMemberTab} 
              onValueChange={setActiveMemberTab}
              className="w-full space-y-4"
            >
              <div className="flex bg-slate-100 p-1.5 rounded-lg overflow-x-auto custom-scrollbar no-scrollbar">
                <TabsList className="justify-start bg-transparent h-auto p-0 flex gap-1">
                  {members.map((member) => {
                    const status = getMemberStatus(member);
                    return (
                      <TabsTrigger 
                        key={member.id} 
                        value={member.id}
                        className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2.5 flex items-center gap-3 whitespace-nowrap rounded-md relative group"
                      >
                        {member.isPrimary && <User className="h-4 w-4 text-[#166FB5]" />}
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-medium">{getTabLabel(member)}</span>
                          {member.cid && (
                            <span className="text-[10px] font-mono text-slate-500 group-data-[state=active]:text-[#166FB5]/70 leading-none mt-0.5">
                              {member.cid}
                            </span>
                          )}
                        </div>
                        <div className={`w-2 h-2 rounded-full ${status.color}`} title={status.label} />
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>

              {members.map((member) => (
            <TabsContent 
              key={member.id} 
              value={member.id}
              className="mt-4 focus-visible:outline-none focus-visible:ring-0"
            >
              <Card className="border border-slate-200">
                <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between py-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <CardTitle className="text-lg font-bold text-slate-800">
                      {member.isPrimary ? "Primary Member Information" : "Team Member Information"}
                    </CardTitle>
                    {member.cid && (
                      <Badge variant="outline" className="bg-blue-50 text-[#166FB5] border-blue-100 font-mono text-[11px] px-2 py-0 h-5">
                        CID: {member.cid}
                      </Badge>
                    )}
                    <Badge className={`${getMemberStatus(member).color} text-white border-0 text-[10px]`}>
                      {getMemberStatus(member).label}
                    </Badge>
                  </div>
                  {!member.isPrimary && projectDetails?.status !== "Completed" && !member.cid && (
                    <Button
                      onClick={() => handleRemoveMember(member.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 font-medium"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove Member
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-6">
                  {renderMemberForm(member)}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Approval Status Banner */}
        {showApprovalCelebration && approvalStatus === "approved" && (
          <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border-2 border-green-300 rounded-xl p-6 shadow-xl animate-in slide-in-from-top duration-500">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg animate-bounce">
                <PartyPopper className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-bold text-xl text-green-800">🎉 Team Members Approved!</h4>
                  <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
                </div>
                <p className="text-green-700 mb-3 leading-relaxed">
                  Great news! Your team members have been reviewed and approved by <strong>{approvalStatusData.reviewedByName || 'the administrator'}</strong>.
                  All members have been registered in the system with their unique Client IDs and your project status has been updated.
                </p>
                {approvalStatusData.reviewNotes && (
                  <div className="bg-white/70 rounded-lg p-3 mt-2 border border-green-200">
                    <p className="text-sm font-semibold text-green-800 mb-1">Admin Notes:</p>
                    <p className="text-sm text-green-700 italic">{approvalStatusData.reviewNotes}</p>
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
                <h4 className="font-semibold text-orange-800">Pending Admin Approval</h4>
                <p className="text-sm text-orange-700 mt-1">
                  Your team members have been submitted for review. An administrator will review and approve or reject the members. You will be notified once a decision is made.
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
                <h4 className="font-semibold text-red-800">Submission Rejected</h4>
                <p className="text-sm text-red-700 mt-1">
                  Your team member submission was rejected by an administrator. Please review and update the member information, then resubmit.
                </p>
                {approvalStatusData.reviewNotes && (
                  <div className="bg-white/70 rounded-lg p-3 mt-2 border border-red-200">
                    <p className="text-sm font-semibold text-red-800 mb-1">Reason for Rejection:</p>
                    <p className="text-sm text-red-700">{approvalStatusData.reviewNotes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {approvalStatus === "approved" && !showApprovalCelebration && members.some(m => m.isDraft) === false && members.filter(m => !m.isPrimary).length > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <ShieldCheck className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-green-800">Team Approved</h4>
                <p className="text-sm text-green-700 mt-1">
                  All team members have been approved and registered in the system with their Client IDs.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Final Submit / Submit for Approval Button */}
        {projectDetails?.status !== "Completed" && approvalStatus !== "pending" && approvalStatus !== "approved" && (
          <div className="pt-6 border-t-2 border-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                {members.filter(m => m.isDraft).length > 0
                  ? "All draft members must be validated before submitting for approval"
                  : "All members must be saved before final submission"
                }
              </div>
              <Button
                onClick={handleFinalSubmit}
                disabled={submitting}
                className="h-14 px-10 bg-gradient-to-r from-[#166FB5] to-[#4038AF] hover:from-[#166FB5]/90 hover:to-[#4038AF]/90 text-white font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-5 w-5 mr-2" />
                Submit Members for Approval
              </Button>
            </div>
          </div>
        )}
          </>
        ) : (
          <Card className="border-2 border-dashed border-slate-300">
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="p-4 bg-blue-100 rounded-full">
                  <FolderOpen className="h-12 w-12 text-[#166FB5]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-700 mb-2">No Project Selected</h3>
                  <p className="text-slate-500 max-w-md">
                    Please select a project from the <strong>Project Overview</strong> section to view and manage its team members.
                  </p>
                </div>
                <Button
                  onClick={() => setActiveSection("project-overview")}
                  className="mt-4 bg-[#166FB5] hover:bg-[#166FB5]/90"
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Go to Project Overview
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // Render function for Quotations section
  const renderQuotations = () => {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="p-4 bg-slate-100 rounded-full">
              <FileTextIcon className="h-12 w-12 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-700">Quotations</h3>
            <p className="text-slate-500 max-w-md">
              Quotation documents and pricing information will be available here once the project administrator generates them.
            </p>
            <Badge variant="outline" className="mt-4">
              🔒 Coming Soon
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render function for Charge Slips section
  const renderChargeSlips = () => {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="p-4 bg-slate-100 rounded-full">
              <CreditCard className="h-12 w-12 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-700">Charge Slips</h3>
            <p className="text-slate-500 max-w-md">
              Payment records and charge slips will appear here as they are processed by the administrator.
            </p>
            <Badge variant="outline" className="mt-4">
              🔒 Coming Soon
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Main section renderer
  const renderActiveSection = () => {
    switch (activeSection) {
      case 'project-overview':
        return renderProjectOverview();
      case 'team-members':
        return renderTeamMembers();
      case 'quotations':
        return renderQuotations();
      case 'charge-slips':
        return renderChargeSlips();
      default:
        return renderTeamMembers();
    }
  };

  return (
    <ClientPortalLayout
      activeSection={activeSection}
      sections={getSections()}
      onSectionChange={setActiveSection}
      projectTitle={projectDetails?.title || "Client Portal"}
      projectId={projectDetails?.pid}
    >
      {renderActiveSection()}

      {/* Confirmation Modal */}
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
        {pendingMemberId && (() => {
          const member = members.find(m => m.id === pendingMemberId);
          if (!member) return null;
          return (
            <div className="space-y-2 text-slate-800 text-sm">
              <div><span className="font-semibold">Full Name:</span> {member.formData.name}</div>
              <div><span className="font-semibold">Email:</span> {member.formData.email}</div>
              <div><span className="font-semibold">Affiliation:</span> {member.formData.affiliation}</div>
              <div><span className="font-semibold">Designation:</span> {member.formData.designation}</div>
              <div><span className="font-semibold">Sex:</span> {member.formData.sex}</div>
              <div><span className="font-semibold">Mobile Number:</span> {member.formData.phoneNumber}</div>
              <div><span className="font-semibold">Affiliation Address:</span> {member.formData.affiliationAddress}</div>
            </div>
          );
        })()}
      </ConfirmationModalLayout>

      {/* Delete Confirmation Modal */}
      <ConfirmationModalLayout
        open={showDeleteModal}
        onConfirm={confirmRemoveMember}
        onCancel={() => {
          setShowDeleteModal(false);
          setMemberToDelete(null);
        }}
        loading={false}
        title="Remove Member?"
        description="Are you sure you want to remove this member from the form? This action will clear their information from the current session."
        confirmLabel="Remove"
        cancelLabel="Cancel"
      >
        <p className="text-sm text-slate-600">
          Note: This will only remove them from this form. If they were previously saved, their record will remain in the database.
        </p>
      </ConfirmationModalLayout>

      {/* Submit for Approval Confirmation Modal */}
      <ConfirmationModalLayout
        open={showSubmitForApprovalModal}
        onConfirm={handleConfirmSubmitForApproval}
        onCancel={() => setShowSubmitForApprovalModal(false)}
        loading={submitting}
        title="Submit Members for Approval"
        description="Once submitted, an administrator will review and approve the team members before they are officially registered in the system."
        confirmLabel="Submit for Approval"
        cancelLabel="Go Back"
      >
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 font-medium mb-2">
              {members.filter(m => m.isDraft && !m.isPrimary).length} member(s) will be submitted for review:
            </p>
            <ul className="space-y-1">
              {members.filter(m => m.isDraft && !m.isPrimary).map(m => (
                <li key={m.id} className="text-sm text-blue-700 flex items-center gap-2">
                  <User className="h-3 w-3" />
                  {m.formData.name || "Unnamed"} — {m.formData.email}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-slate-500">
            You will be notified once the administrator has reviewed your submission. No CIDs will be generated until approval.
          </p>
        </div>
      </ConfirmationModalLayout>
    </ClientPortalLayout>
  );
}
