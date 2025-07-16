"use client";

// Client information form entry page

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { z } from "zod";
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
import { getNextCid } from "@/services/clientService";
import { getNextPid } from "@/services/projectsService";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import ConfirmationModalLayout from "@/components/modal/ConfirmationModalLayout";

export default function ClientFormEntry() {
  const [formData, setFormData] = useState<ClientFormData>({
    name: "",
    email: "",
    affiliation: "",
    designation: "",
    sex: "M",
    phoneNumber: "",
    affiliationAddress: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ClientFormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [googleUser, setGoogleUser] = useState<{ email: string } | null>(null);
  const [isContactPerson, setIsContactPerson] = useState(false);
  const [haveSubmitted, setHaveSubmitted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingData, setPendingData] = useState<ClientFormData | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Only allow access if email and inquiryId are present in query params
  const emailParam = searchParams.get('email');
  const inquiryIdParam = searchParams.get('inquiryId');

  useEffect(() => {
    // Only redirect to /verify if query params are missing
    if (!emailParam || !inquiryIdParam) {
      router.replace('/verify');
    }
  }, [emailParam, inquiryIdParam, router]);

  useEffect(() => {
    // Fetch client record for permissions
    async function fetchClientPermission() {
      if (!emailParam || !inquiryIdParam) return;
      // Find client by email and inquiryId (pid)
      const clientQuery = await getDoc(doc(db, "clients", emailParam));
      if (clientQuery.exists()) {
        setIsContactPerson(!!clientQuery.data().isContactPerson);
        setHaveSubmitted(!!clientQuery.data().haveSubmitted);
      }
    }
    fetchClientPermission();
  }, [emailParam, inquiryIdParam]);

  if (!emailParam || !inquiryIdParam) {
    return null;
  }

  // Pre-fill email and lock the field
  useEffect(() => {
    if (emailParam) {
      setFormData((prev) => ({ ...prev, email: emailParam }));
    }
  }, [emailParam]);

  const handleChange = (field: keyof ClientFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = clientFormSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ClientFormData, string>> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof ClientFormData;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
    } else {
      setErrors({});
      setPendingData(formData);
      setShowConfirmModal(true);
    }
  };

  const handleConfirmSave = async () => {
    setShowConfirmModal(false);
    setSubmitting(true);
    try {
      // Parse pendingData for validation and field access
      const result = clientFormSchema.safeParse(pendingData);
      if (!result.success) {
        setErrors({ name: "Invalid data. Please review your entries." });
        setSubmitting(false);
        return;
      }
      const year = new Date().getFullYear();
      const cid = await getNextCid(year);
      // Get the correct project id for this inquiry
      const inquiryDoc = await getDoc(doc(db, "inquiries", inquiryIdParam));
      let pid;
      let inquiryContactEmail = "";
      if (inquiryDoc.exists()) {
        const inquiry = inquiryDoc.data();
        inquiryContactEmail = inquiry.email;
        // Query for contact person client record by isContactPerson, inquiry email, and inquiryId
        const contactPersonQuery = await import("firebase/firestore").then(({ query, where, getDocs, collection }) =>
          getDocs(query(
            collection(db, "clients"),
            where("isContactPerson", "==", true),
            where("email", "==", inquiryContactEmail),
            where("inquiryId", "==", inquiryIdParam)
          ))
        );
        if (!contactPersonQuery.empty) {
          const contactPersonDoc = contactPersonQuery.docs[0];
          pid = contactPersonDoc.data().pid;
        }
      }
      // Find existing project for this inquiry
      let projectQuery = await import("firebase/firestore").then(({ query, where, getDocs, collection }) =>
        getDocs(query(collection(db, "projects"), where("inquiryId", "==", inquiryIdParam)))
      );
      if (!projectQuery.empty) {
        const projectDoc = projectQuery.docs[0];
        pid = projectDoc.data().pid;
      }
      // Only create a new project if none exists for this inquiry
      if (!pid) {
        pid = await getNextPid(year);
      }
      // Save client with pid
      const clientDocId = cid; 
      // Set isContactPerson strictly by comparing to inquiry's contact email
      const isContactPersonValue = result.data.email === inquiryContactEmail;
      await setDoc(doc(db, "clients", clientDocId), {
        ...result.data,
        cid,
        pid, 
        year,
        inquiryId: inquiryIdParam,
        createdAt: serverTimestamp(),
        isContactPerson: isContactPersonValue,
      });
      // If contact person, set haveSubmitted in inquiry
      if (isContactPersonValue) {
        await setDoc(doc(db, "inquiries", inquiryIdParam), { haveSubmitted: true }, { merge: true });
      }
      // Fetch updated client record
      const updatedClientSnap = await getDoc(doc(db, "clients", clientDocId));
      const updatedClient = updatedClientSnap.exists() ? updatedClientSnap.data() : {};
      // Append client name to project clientNames array
      const projectDocRef = doc(db, "projects", pid);
      const projectSnap = await getDoc(projectDocRef);
      let clientNames: string[] = [];
      if (projectSnap.exists()) {
        clientNames = projectSnap.data().clientNames || [];
      }
      if (!clientNames.includes(result.data.name)) {
        clientNames.push(result.data.name);
      }
      await setDoc(projectDocRef, {
        pid,
        year,
        clientNames,
        startDate: serverTimestamp(),
        inquiryId: inquiryIdParam,
     
      }, { merge: true });
      // Use updated client record for permission check
      if (updatedClient.isContactPerson && inquiryContactEmail && updatedClient.email === inquiryContactEmail) {
        router.push(`/client/project-info?pid=${pid}&cid=${clientDocId}&inquiryId=${inquiryIdParam}`);
      } else {
        setSubmitting(false);
        toast.success("Client information submitted successfully! Only the contact person can fill out the project information form. Redirecting...");
        router.push("/client/client-info/submitted");
      }
    } catch (err) {
      setErrors({ name: "Failed to save client/project. Please try again." });
      setSubmitting(false);
    }
  };

  const handleCancelModal = () => {
    setShowConfirmModal(false);
    setPendingData(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50/50 to-blue-50/30 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 bg-gradient-to-r from-[#F69122] to-[#912ABD] rounded-full"></div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#166FB5] to-[#4038AF] bg-clip-text text-transparent">
                Client Information Form
              </h1>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
              <p className="text-slate-700 leading-relaxed">
                To help us serve you better, please complete this form with accurate and updated details. 
                Your information will be handled with strict confidentiality and will only be used for 
                official purposes related to your request, project, or collaboration with PGC.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name Field */}
              <div className="md:col-span-2">
                <Label className="text-sm font-semibold text-slate-700 mb-2 block">
                  Full Name <span className="text-[#B9273A]">*</span>
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Enter your full name"
                  className="bg-white/70 border-slate-200 focus:border-[#166FB5] focus:ring-[#166FB5]/20 h-12"
                />
                {errors.name && <p className="text-[#B9273A] text-sm mt-1 flex items-center gap-1">
                  <span className="w-1 h-1 bg-[#B9273A] rounded-full"></span>
                  {errors.name}
                </p>}
              </div>

              {/* Email Field */}
              <div className="md:col-span-2">
                <Label className="text-sm font-semibold text-slate-700 mb-2 block">
                  Email Address <span className="text-[#B9273A]">*</span>
                </Label>
                <Input
                  value={formData.email}
                  disabled
                  placeholder="Verified email address"
                  className="bg-slate-50 border-slate-200 text-slate-600 h-12 cursor-not-allowed"
                />
                {errors.email && <p className="text-[#B9273A] text-sm mt-1 flex items-center gap-1">
                  <span className="w-1 h-1 bg-[#B9273A] rounded-full"></span>
                  {errors.email}
                </p>}
              </div>

              {/* Affiliation Field */}
              <div className="md:col-span-2">
                <Label className="text-sm font-semibold text-slate-700 mb-2 block">
                  Affiliation (Department & Institution) <span className="text-[#B9273A]">*</span>
                </Label>
                <Input
                  value={formData.affiliation}
                  onChange={(e) => handleChange("affiliation", e.target.value)}
                  placeholder="e.g. Division of Biological Sciences - UPV CAS"
                  className="bg-white/70 border-slate-200 focus:border-[#166FB5] focus:ring-[#166FB5]/20 h-12"
                />
                {errors.affiliation && <p className="text-[#B9273A] text-sm mt-1 flex items-center gap-1">
                  <span className="w-1 h-1 bg-[#B9273A] rounded-full"></span>
                  {errors.affiliation}
                </p>}
              </div>

              {/* Designation Field */}
              <div>
                <Label className="text-sm font-semibold text-slate-700 mb-2 block">
                  Designation <span className="text-[#B9273A]">*</span>
                </Label>
                <Input
                  value={formData.designation}
                  onChange={(e) => handleChange("designation", e.target.value)}
                  placeholder="e.g. Research Assistant, Professor"
                  className="bg-white/70 border-slate-200 focus:border-[#166FB5] focus:ring-[#166FB5]/20 h-12"
                />
                {errors.designation && <p className="text-[#B9273A] text-sm mt-1 flex items-center gap-1">
                  <span className="w-1 h-1 bg-[#B9273A] rounded-full"></span>
                  {errors.designation}
                </p>}
              </div>

              {/* Sex Field */}
              <div>
                <Label className="text-sm font-semibold text-slate-700 mb-2 block">
                  Assigned sex at birth <span className="text-[#B9273A]">*</span>
                </Label>
                <Select value={formData.sex} onValueChange={(val) => handleChange("sex", val)}>
                  <SelectTrigger className="bg-white/70 border-slate-200 focus:border-[#166FB5] focus:ring-[#166FB5]/20 h-12">
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
                  value={formData.phoneNumber}
                  onChange={(e) => handleChange("phoneNumber", e.target.value)}
                  placeholder="e.g. 09091234567"
                  className="bg-white/70 border-slate-200 focus:border-[#166FB5] focus:ring-[#166FB5]/20 h-12"
                />
                {errors.phoneNumber && <p className="text-[#B9273A] text-sm mt-1 flex items-center gap-1">
                  <span className="w-1 h-1 bg-[#B9273A] rounded-full"></span>
                  {errors.phoneNumber}
                </p>}
              </div>

              {/* Affiliation Address Field */}
              <div className="md:col-span-2">
                <Label className="text-sm font-semibold text-slate-700 mb-2 block">
                  Affiliation Address <span className="text-[#B9273A]">*</span>
                </Label>
                <Textarea
                  value={formData.affiliationAddress}
                  onChange={(e) => handleChange("affiliationAddress", e.target.value)}
                  placeholder="Enter complete address of your institution/organization"
                  className="bg-white/70 border-slate-200 focus:border-[#166FB5] focus:ring-[#166FB5]/20 min-h-[100px] resize-none"
                />
                {errors.affiliationAddress && <p className="text-[#B9273A] text-sm mt-1 flex items-center gap-1">
                  <span className="w-1 h-1 bg-[#B9273A] rounded-full"></span>
                  {errors.affiliationAddress}
                </p>}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-8 border-t border-slate-100">
              <Button 
                type="submit" 
                className="h-12 px-8 bg-gradient-to-r from-[#166FB5] to-[#4038AF] hover:from-[#166FB5]/90 hover:to-[#4038AF]/90 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"

                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Confirmation Modal */}
      <ConfirmationModalLayout
        open={showConfirmModal}
        onConfirm={handleConfirmSave}
        onCancel={handleCancelModal}
        loading={submitting}
        title="Please double check before saving"
        description="Review your entries below before confirming. This action cannot be undone."
        confirmLabel="Confirm & Submit"
        cancelLabel="Go Back"
      >
        {pendingData && (
          <div className="space-y-2 text-slate-800 text-sm">
            <div><span className="font-semibold">Full Name:</span> {pendingData.name}</div>
            <div><span className="font-semibold">Email:</span> {pendingData.email}</div>
            <div><span className="font-semibold">Affiliation:</span> {pendingData.affiliation}</div>
            <div><span className="font-semibold">Designation:</span> {pendingData.designation}</div>
            <div><span className="font-semibold">Sex:</span> {pendingData.sex}</div>
            <div><span className="font-semibold">Mobile Number:</span> {pendingData.phoneNumber}</div>
            <div><span className="font-semibold">Affiliation Address:</span> {pendingData.affiliationAddress}</div>
          </div>
        )}
      </ConfirmationModalLayout>
    </div>
  );
}
