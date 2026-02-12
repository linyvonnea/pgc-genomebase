"use client";

// Client Portal with Sidebar Navigation

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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getNextCid } from "@/services/clientService";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import ConfirmationModalLayout from "@/components/modal/ConfirmationModalLayout";
import ClientPortalLayout, { SidebarSection } from "@/components/layout/ClientPortalLayout";
import { Plus, X, CheckCircle2, AlertCircle, Loader2, FolderOpen, Calendar, Building2, User, FileText, Users, FileText as FileTextIcon, CreditCard, Save, Trash2 } from "lucide-react";

interface ClientMember {
  id: string; // Unique tab identifier
  cid: string; // Firestore client ID
  formData: ClientFormData;
  errors: Partial<Record<keyof ClientFormData, string>>;
  isSubmitted: boolean;
  isPrimary: boolean; // First member (logged-in user)
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
  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(null);
  const [expandedMember, setExpandedMember] = useState<string>("primary");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);

  // Initialize with primary member on mount
  useEffect(() => {
    async function initializePrimaryMember() {
      if (!emailParam || !inquiryIdParam) {
        console.log("❌ Missing email or inquiryId, redirecting to /verify");
        router.replace('/verify');
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
            cid: newCid,
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

          // Create initial record in Firestore
          console.log("💾 Creating Firestore document for primary member...");
          await setDoc(doc(db, "clients", newCid), {
            cid: newCid,
            email: emailParam,
            inquiryId: inquiryIdParam,
            pid: pidParam || "",
            isContactPerson: true,
            haveSubmitted: false,
            createdAt: serverTimestamp(),
            name: "",
            affiliation: "",
            designation: "",
            sex: "M",
            phoneNumber: "",
            affiliationAddress: "",
          });
          console.log("✅ Primary member Firestore document created:", newCid);
          console.log("👤 Primary member state:", primaryMember);
        }

        // Load additional team members if they exist
        // Query all clients for this inquiry, then filter out primary user client-side
        // This avoids needing a composite index for "inquiryId == X && email != Y"
        const allMembersQuery = query(
          clientsRef,
          where("inquiryId", "==", inquiryIdParam)
        );
        const allMembersSnapshot = await getDocs(allMembersQuery);
        console.log("📊 All clients for inquiry:", allMembersSnapshot.size);

        const additionalMembers: ClientMember[] = allMembersSnapshot.docs
          .filter(doc => {
            const email = doc.data().email;
            // Exclude the primary user's email
            return email && email.toLowerCase() !== emailParam.toLowerCase();
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
            };
          });
        console.log("👥 Additional members found:", additionalMembers.length);

        // Fetch project details if pid is available
        let fetchedProjectDetails: ProjectDetails | null = null;
        if (pidParam) {
          console.log("📁 Fetching project details for PID:", pidParam);
          const projectDoc = await getDoc(doc(db, "projects", pidParam));
          if (projectDoc.exists()) {
            const projectData = projectDoc.data();
            fetchedProjectDetails = {
              pid: projectData.pid || pidParam,
              title: projectData.title || "Untitled Project",
              lead: projectData.lead || "Not specified",
              startDate: projectData.startDate?.toDate?.() || projectData.startDate || new Date(),
              sendingInstitution: projectData.sendingInstitution || "Not specified",
              fundingInstitution: projectData.fundingInstitution || "Not specified",
              status: projectData.status || "Active",
              inquiryId: projectData.iid || inquiryIdParam || "",
            };
            setProjectDetails(fetchedProjectDetails);
            console.log("✅ Project details loaded:", fetchedProjectDetails);
          } else {
            console.log("⚠️ Project document not found:", pidParam);
          }
        }

        const allMembers = [primaryMember, ...additionalMembers];
        console.log("👥 Setting members array:", allMembers.length, "members");
        console.log("📋 Members:", allMembers);
        setMembers(allMembers);
        // Set active section to project-overview if project exists, otherwise team-members
        const initialSection = fetchedProjectDetails ? "project-overview" : "team-members";
        setActiveSection(initialSection);
        setExpandedMember("primary");
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

  const handleAddMember = async () => {
    console.log("➕ Add Member button clicked");
    try {
      const year = new Date().getFullYear();
      console.log("📅 Generating new CID for year:", year);
      const newCid = await getNextCid(year);
      console.log("🎫 Generated new CID:", newCid);
      const newMemberId = `member-${Date.now()}`;
      console.log("🆔 New member ID:", newMemberId);

      const newMember: ClientMember = {
        id: newMemberId,
        cid: newCid,
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
      };

      // Create initial record in Firestore
      console.log("💾 Creating Firestore document for new member...");
      await setDoc(doc(db, "clients", newCid), {
        cid: newCid,
        email: "",
        inquiryId: inquiryIdParam,
        pid: pidParam || "",
        isContactPerson: false,
        haveSubmitted: false,
        createdAt: serverTimestamp(),
        name: "",
        affiliation: "",
        designation: "",
        sex: "M",
        phoneNumber: "",
        affiliationAddress: "",
      });
      console.log("✅ Firestore document created for new member:", newCid);

      const updatedMembers = [...members, newMember];
      console.log("👥 Updated members array:", updatedMembers.length, "members");
      setMembers(updatedMembers);
      setExpandedMember(newMemberId);
      console.log("✅ New member added successfully. Active tab:", newMemberId);
      toast.success(`New member tab created (${newCid})`);
    } catch (error) {
      console.error("❌ Error adding member:", error);
      toast.error(`Failed to add member: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRemoveMember = (memberId: string) => {
    setMemberToDelete(memberId);
    setShowDeleteModal(true);
  };

  const confirmRemoveMember = async () => {
    if (!memberToDelete) return;

    const member = members.find(m => m.id === memberToDelete);
    if (!member) return;

    try {
      // Delete the client document from Firestore
      console.log("🗑️ Deleting client document:", member.cid);
      await deleteDoc(doc(db, "clients", member.cid));
      console.log("✅ Client document deleted successfully");
      
      // Remove from local state
      const updatedMembers = members.filter(m => m.id !== memberToDelete);
      setMembers(updatedMembers);
      
      // Switch to primary member if deleting active member
      if (expandedMember === memberToDelete) {
        setExpandedMember("primary");
      }

      toast.success("Member removed and deleted from database");
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

      // Determine project context
      const inquiryDoc = await getDoc(doc(db, "inquiries", inquiryIdParam!));
      let pid = pidParam;
      
      if (inquiryDoc.exists() && !pid) {
        const projectQuery = query(
          collection(db, "projects"), 
          where("inquiryId", "==", inquiryIdParam)
        );
        const projectSnapshot = await getDocs(projectQuery);
        if (!projectSnapshot.empty) {
          pid = projectSnapshot.docs[0].id;
        }
      }

      // Update client record
      await setDoc(doc(db, "clients", member.cid), {
        ...result.data,
        cid: member.cid,
        pid: pid || "",
        inquiryId: inquiryIdParam,
        isContactPerson: member.isPrimary,
        haveSubmitted: true,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Update project's clientNames array
      if (pid) {
        const projectDocRef = doc(db, "projects", pid);
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

      // Update member state to submitted
      setMembers(members.map(m => 
        m.id === pendingMemberId ? { ...m, isSubmitted: true } : m
      ));

      toast.success(`${member.isPrimary ? 'Your' : 'Member'} information saved successfully!`);
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Failed to save information");
    } finally {
      setSubmitting(false);
      setPendingMemberId(null);
    }
  };

  const handleFinalSubmit = () => {
    const allSubmitted = members.every(m => m.isSubmitted);
    
    if (!allSubmitted) {
      toast.error("Please save all member information before proceeding");
      return;
    }

    toast.success("All members submitted successfully! Redirecting...");
    router.push("/client/client-info/submitted");
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
    if (member.isSubmitted) {
      return { label: "Completed", color: "bg-green-500", icon: CheckCircle2 };
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
            onClick={() => router.push('/verify')}
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
    if (!projectDetails) {
      return (
        <Card>
          <CardContent className="p-6">
            <p className="text-slate-600">No project details available.</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        {/* Project Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">{projectDetails.title}</h3>
              <p className="text-sm text-slate-600">Project ID: <span className="font-mono font-semibold text-[#166FB5]">{projectDetails.pid}</span></p>
            </div>
            <Badge className="bg-green-500 text-white">{projectDetails.status}</Badge>
          </div>
        </div>

        {/* Project Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Project Lead */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="h-5 w-5 text-[#166FB5]" />
              </div>
              <Label className="text-sm font-semibold text-slate-600">Project Lead</Label>
            </div>
            <p className="text-lg font-medium text-slate-800 ml-11">{projectDetails.lead}</p>
          </div>

          {/* Start Date */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <Label className="text-sm font-semibold text-slate-600">Start Date</Label>
            </div>
            <p className="text-lg font-medium text-slate-800 ml-11">
              {typeof projectDetails.startDate === 'string' 
                ? new Date(projectDetails.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                : projectDetails.startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Sending Institution */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Building2 className="h-5 w-5 text-orange-600" />
              </div>
              <Label className="text-sm font-semibold text-slate-600">Sending Institution</Label>
            </div>
            <p className="text-lg font-medium text-slate-800 ml-11">{projectDetails.sendingInstitution}</p>
          </div>

          {/* Funding Institution */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileText className="h-5 w-5 text-green-600" />
              </div>
              <Label className="text-sm font-semibold text-slate-600">Funding Institution</Label>
            </div>
            <p className="text-lg font-medium text-slate-800 ml-11">{projectDetails.fundingInstitution}</p>
          </div>
        </div>

        {/* Inquiry Reference */}
        {projectDetails.inquiryId && (
          <div className="bg-slate-50 rounded-lg border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold text-slate-600 block mb-1">Related Inquiry</Label>
                <p className="text-sm text-slate-700">Inquiry ID: <span className="font-mono font-semibold">{projectDetails.inquiryId}</span></p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Hint */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-5">
          <p className="text-sm text-amber-900">
            ℹ️ <strong>Next Step:</strong> Switch to the <strong>Team Members</strong> section to complete your personal information, 
            then add additional team members as needed.
          </p>
        </div>
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
              disabled={member.isSubmitted}
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
              disabled={member.isPrimary || member.isSubmitted}
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
              disabled={member.isSubmitted}
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
              disabled={member.isSubmitted}
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
              disabled={member.isSubmitted}
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
              disabled={member.isSubmitted}
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
              disabled={member.isSubmitted}
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
        <div className="flex justify-end pt-6 border-t border-slate-100">
          <Button 
            type="submit" 
            disabled={member.isSubmitted || submitting}
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
        {/* Instructions Card */}
        <Card>
          <CardContent className="p-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
              <p className="text-slate-700 leading-relaxed">
                {projectDetails ? (
                  <>
                    Complete your information in the <strong>Primary Member</strong> section below. 
                    Use <strong>+ Add Member</strong> to include additional team members.
                  </>
                ) : (
                  <>
                    Add all project team members below. Each member will have their own record in the system.
                    The first section is for you (the primary contact). Click the <strong>+ Add Member</strong> button
                    to add additional team members.
                  </>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Member Count and Add Button */}
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
            className="border-[#166FB5] text-[#166FB5] hover:bg-[#166FB5] hover:text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Member
          </Button>
        </div>

        {/* Members Accordion */}
        <Accordion 
          type="single" 
          collapsible 
          value={expandedMember} 
          onValueChange={setExpandedMember}
          className="space-y-4"
        >
          {members.map((member) => {
            const status = getMemberStatus(member);
            return (
              <AccordionItem 
                key={member.id} 
                value={member.id}
                className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-slate-50">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      {member.isPrimary && <User className="h-5 w-5 text-[#166FB5]" />}
                      <span className="font-semibold text-slate-800">
                        {getTabLabel(member)}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={`${status.color} text-white border-0 text-xs`}
                      >
                        {status.label}
                      </Badge>
                    </div>
                    {!member.isPrimary && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveMember(member.id);
                        }}
                        className="ml-4 hover:bg-red-100 rounded-full p-2 transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 pt-2">
                  <Card>
                    <CardContent className="p-6">
                      {renderMemberForm(member)}
                    </CardContent>
                  </Card>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {/* Final Submit Button */}
        <div className="pt-6 border-t-2 border-slate-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              All members must be saved before final submission
            </div>
            <Button
              onClick={handleFinalSubmit}
              disabled={!members.every(m => m.isSubmitted)}
              className="h-14 px-10 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-5 w-5 mr-2" />
              Complete & Submit All Members
            </Button>
          </div>
        </div>
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
    </ClientPortalLayout>
  );
}
