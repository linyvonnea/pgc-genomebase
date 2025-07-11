"use client";

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

export default function ClientFormEntry() {
  const [step, setStep] = useState<"verify" | "form">("verify");
  const [inquiryId, setInquiryId] = useState("");
  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifying, setVerifying] = useState(false);
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
    // Fetch client record for permission logic
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
      setSubmitting(true);
      try {
        const year = new Date().getFullYear();
        const cid = await getNextCid(year);
        // Get the correct project id for this inquiry
        let pid;
        // Try to get the contact person's client record by inquiry email
        const inquiryDoc = await getDoc(doc(db, "inquiries", inquiryIdParam));
        let contactClientDoc = null;
        let inquiryContactEmail = "";
        if (inquiryDoc.exists()) {
          const inquiry = inquiryDoc.data();
          inquiryContactEmail = inquiry.email;
          contactClientDoc = await getDoc(doc(db, "clients", inquiryContactEmail));
          if (contactClientDoc.exists()) {
            pid = contactClientDoc.data().pid;
          }
        }
        // Fallback: if not found, use generated pid
        if (!pid) {
          pid = await getNextPid(year);
        }
        // Save client with pid
        const clientDocId = result.data.email === emailParam ? result.data.email : cid;
        // Set isContactPerson strictly by comparing to inquiry's contact email
        const isContactPersonValue = result.data.email === inquiryContactEmail;
        await setDoc(doc(db, "clients", clientDocId), {
          ...result.data,
          cid,
          pid, // always use the correct project id
          year,
          createdAt: serverTimestamp(),
          isContactPerson: isContactPersonValue,
          haveSubmitted: true,
        });
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
          // ...other fields
        }, { merge: true });
        // Use updated client record for permission check
        if (updatedClient.isContactPerson && updatedClient.haveSubmitted) {
          router.push(`/client/project-info?pid=${pid}&cid=${clientDocId}&inquiryId=${inquiryIdParam}`);
        } else {
          setSubmitting(false);
          toast.success("Client information submitted successfully! Only the contact person can fill out the project information form.");
        }
      } catch (err) {
        setErrors({ name: "Failed to save client/project. Please try again." });
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50/50 to-blue-50/30 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8">
          {/* Modern Header */}
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
                  Gender <span className="text-[#B9273A]">*</span>
                </Label>
                <Select value={formData.sex} onValueChange={(val) => handleChange("sex", val)}>
                  <SelectTrigger className="bg-white/70 border-slate-200 focus:border-[#166FB5] focus:ring-[#166FB5]/20 h-12">
                    <SelectValue placeholder="Select gender" />
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
                className="h-12 px-8 bg-gradient-to-r from-[#F69122] via-[#B9273A] to-[#912ABD] hover:from-[#F69122]/90 hover:via-[#B9273A]/90 hover:to-[#912ABD]/90 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Continue to Project Information"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
