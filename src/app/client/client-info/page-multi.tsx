"use client";

// Multi-member Client Information Form with Tabs

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import { doc, setDoc, serverTimestamp, getDoc, collection, query, where, getDocs } from "firebase/firestore";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { getNextCid } from "@/services/clientService";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import ConfirmationModalLayout from "@/components/modal/ConfirmationModalLayout";
import { Plus, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface ClientMember {
  id: string; // Unique tab identifier
  cid: string; // Firestore client ID
  formData: ClientFormData;
  errors: Partial<Record<keyof ClientFormData, string>>;
  isSubmitted: boolean;
  isPrimary: boolean; // First member (logged-in user)
}

export default function MultiMemberClientForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const emailParam = searchParams.get('email');
  const inquiryIdParam = searchParams.get('inquiryId');
  const pidParam = searchParams.get('pid');

  const [members, setMembers] = useState<ClientMember[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
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
        router.replace('/verify');
        return;
      }

      setLoading(true);
      try {
        // Check if primary member already exists
        const clientsRef = collection(db, "clients");
        const clientQuery = query(
          clientsRef,
          where("email", "==", emailParam),
          where("inquiryId", "==", inquiryIdParam)
        );
        const clientSnapshot = await getDocs(clientQuery);

        let primaryMember: ClientMember;

        if (!clientSnapshot.empty) {
          // Load existing primary member
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
          // Create new primary member
          const year = new Date().getFullYear();
          const newCid = await getNextCid(year);
          
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
        }

        // Load additional team members if they exist
        const allMembersQuery = query(
          clientsRef,
          where("inquiryId", "==", inquiryIdParam),
          where("email", "!=", emailParam)
        );
        const allMembersSnapshot = await getDocs(allMembersQuery);

        const additionalMembers: ClientMember[] = allMembersSnapshot.docs.map((doc, index) => {
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

        setMembers([primaryMember, ...additionalMembers]);
        setActiveTab("primary");
      } catch (error) {
        console.error("Error initializing form:", error);
        toast.error("Failed to load member data");
      } finally {
        setLoading(false);
      }
    }

    initializePrimaryMember();
  }, [emailParam, inquiryIdParam, pidParam, router]);

  const handleAddMember = async () => {
    try {
      const year = new Date().getFullYear();
      const newCid = await getNextCid(year);
      const newMemberId = `member-${Date.now()}`;

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

      setMembers([...members, newMember]);
      setActiveTab(newMemberId);
      toast.success("New member tab created");
    } catch (error) {
      console.error("Error adding member:", error);
      toast.error("Failed to add member");
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
      // Note: We're not deleting from Firestore to maintain history
      // Just remove from local state
      const updatedMembers = members.filter(m => m.id !== memberToDelete);
      setMembers(updatedMembers);
      
      // Switch to primary tab if deleting active tab
      if (activeTab === memberToDelete) {
        setActiveTab("primary");
      }

      toast.success("Member removed from form");
    } catch (error) {
      console.error("Error removing member:", error);
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
      return member.formData.name || "You (Primary)";
    }
    return member.formData.name || `Member ${members.indexOf(member)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50/50 to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#166FB5] mb-2" />
          <p className="text-slate-600">Loading form...</p>
        </div>
      </div>
    );
  }

  if (!emailParam || !inquiryIdParam) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50/50 to-blue-50/30 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 bg-gradient-to-r from-[#F69122] to-[#912ABD] rounded-full"></div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#166FB5] to-[#4038AF] bg-clip-text text-transparent">
                Project Team Information
              </h1>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
              <p className="text-slate-700 leading-relaxed">
                Add all project team members below. Each member will have their own record in the system.
                The first tab is for you (the primary contact). Click the <strong>+ Add Member</strong> button
                to add additional team members.
              </p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center gap-4 mb-6">
              <TabsList className="flex-1 justify-start h-auto p-1 bg-slate-100/50">
                {members.map((member) => {
                  const status = getMemberStatus(member);
                  return (
                    <TabsTrigger
                      key={member.id}
                      value={member.id}
                      className="relative data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[120px]">
                          {getTabLabel(member)}
                        </span>
                        <Badge 
                          variant="outline" 
                          className={`${status.color} text-white border-0 text-xs`}
                        >
                          {status.label}
                        </Badge>
                        {!member.isPrimary && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveMember(member.id);
                            }}
                            className="ml-1 hover:bg-red-100 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3 text-red-600" />
                          </button>
                        )}
                      </div>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              
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

            {members.map((member) => (
              <TabsContent key={member.id} value={member.id} className="mt-0">
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
                      </Label>
                      <Input
                        value={member.formData.email}
                        onChange={(e) => handleChange(member.id, "email", e.target.value)}
                        placeholder="Enter email address"
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
              </TabsContent>
            ))}
          </Tabs>

          {/* Final Submit Button */}
          <div className="mt-8 pt-8 border-t-2 border-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                <strong>{members.filter(m => m.isSubmitted).length}</strong> of <strong>{members.length}</strong> members saved
              </div>
              <Button
                onClick={handleFinalSubmit}
                disabled={!members.every(m => m.isSubmitted)}
                className="h-14 px-10 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Complete & Submit All Members
              </Button>
            </div>
          </div>
        </div>
      </div>

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
    </div>
  );
}
