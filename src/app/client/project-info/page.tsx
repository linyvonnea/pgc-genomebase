// This is the Project Information Form page for clients to submit or update project details.
// It includes permission checks, data fetching, and a confirmation modal before final submission.

"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from "zod";
import { projectFormSchema, ProjectFormData } from "@/schemas/projectSchema"; 
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfirmationModalLayout from "@/components/modal/ConfirmationModalLayout";

export default function ProjectForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Get project, client, and inquiry IDs from URL
  const pid = searchParams.get("pid");
  const cid = searchParams.get("cid");
  const inquiryId = searchParams.get("inquiryId");

  // Form state
  const [formData, setFormData] = useState<ProjectFormData>({
    title: "",
    projectLead: "",
    startDate: new Date(),
    sendingInstitution: "Government",
    fundingInstitution: "",
  });
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<keyof ProjectFormData, string>>>({});
  const [startOpen, setStartOpen] = useState(false);
  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingData, setPendingData] = useState<ProjectFormData | null>(null);

  // Fetch project data if editing an existing project
  useEffect(() => {
    async function fetchProject() {
      if (!pid) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const docRef = doc(db, "projects", pid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setFormData({
            title: data.title || "",
            projectLead: data.lead || "",
            startDate: data.startDate?.toDate?.() || new Date(data.startDate),
            sendingInstitution: data.sendingInstitution || "",
            fundingInstitution: data.fundingInstitution || "",
          });
        }
      } catch {
        toast.error("Failed to load project data.");
      } finally {
        setLoading(false);
      }
    }
    fetchProject();
  }, [pid]);

  // Permission check: Only allow access if user is contact person and client info is submitted
  useEffect(() => {
    async function checkPermission() {
      if (!cid) {
        toast.error("Missing client ID. Please verify first.");
        router.replace("/verify");
        return;
      }
      // Defensive: check both by cid and by contact person's email from inquiry
      let clientDoc = await getDoc(doc(db, "clients", cid));
      let clientData = clientDoc.exists() ? clientDoc.data() : null;
      let inquiryDocSnap = null;
      let inquiry = null;
      if (inquiryId) {
        inquiryDocSnap = await getDoc(doc(db, "inquiries", inquiryId));
        if (inquiryDocSnap.exists()) {
          inquiry = inquiryDocSnap.data();
        }
      }
      if (!clientData && inquiry) {
        // Try to get by contact person's email from inquiry
        const contactDoc = await getDoc(doc(db, "clients", inquiry.email));
        if (contactDoc.exists()) {
          clientData = contactDoc.data();
        }
      }
      // Only allow access if isContactPerson is true AND inquiry.haveSubmitted is true
      if (!clientData || !clientData.isContactPerson || !inquiry?.haveSubmitted) {
        toast.error("Only the contact person can access the project information form after submitting client info.");
        router.replace("/client/client-info?email=" + encodeURIComponent(clientData?.email || "") + "&inquiryId=" + encodeURIComponent(inquiryId || ""));
        return;
      }
    }
    checkPermission();
  }, [cid, inquiryId, router]);

  // Handle form field changes
  const handleChange = (field: keyof ProjectFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // On form submit, validate and show confirmation modal
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = projectFormSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ProjectFormData, string>> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof ProjectFormData;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setPendingData(formData); // Store data for modal
    setShowConfirmModal(true); // Show confirmation modal
  };

  // On confirm in modal, save project to Firestore
  const handleConfirmSave = async () => {
    setShowConfirmModal(false);
    try {
      const result = projectFormSchema.safeParse(pendingData);
      if (!result.success) {
        toast.error("Invalid data. Please review your entries.");
        return;
      }
      const year = result.data.startDate.getFullYear();
      const docRef = doc(db, "projects", pid!);
      let clientName = "";
      if (cid) {
        const clientDoc = await getDoc(doc(db, "clients", cid));
        if (clientDoc.exists()) {
          clientName = clientDoc.data().name || "";
        }
      }
      // Prepare project payload
      const snap = await getDoc(docRef);
      let createdAt = serverTimestamp();
      let existingClientNames: string[] = [];
      if (snap.exists()) {
        createdAt = snap.data().createdAt || createdAt;
        existingClientNames = snap.data().clientNames || [];
      }
      const updatedClientNames = clientName && !existingClientNames.includes(clientName) 
        ? [...existingClientNames, clientName]
        : existingClientNames;
      const payload = {
        pid,
        iid: inquiryId || "",
        year,
        startDate: Timestamp.fromDate(result.data.startDate),
        createdAt,
        lead: result.data.projectLead,
        clientNames: updatedClientNames,
        title: result.data.title,
        projectTag: "",
        status: "",
        sendingInstitution: result.data.sendingInstitution,
        fundingCategory: "",
        fundingInstitution: result.data.fundingInstitution,
        serviceRequested: [],
        personnelAssigned: "",
        notes: "",
      };
      await setDoc(docRef, payload, { merge: true });
      toast.success("Project added successfully! Redirecting...");
      setTimeout(() => {
        router.push("/client/project-info/submitted");
      }, 1500);
    } catch {
      toast.error("Error updating project. Please try again.");
    }
  };

  // Cancel confirmation modal
  const handleCancelModal = () => {
    setShowConfirmModal(false);
    setPendingData(null);
  };

  // Format date for display
  const formatDate = (date: Date | null) =>
    date?.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }) || "";

  // Show loading skeleton while fetching project data
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50/50 to-blue-50/30">
        <div className="bg-white/80 p-8 rounded-2xl shadow-xl border border-white/50 backdrop-blur-sm">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-slate-200 rounded w-48" />
            <div className="h-4 bg-slate-100 rounded w-64" />
          </div>
        </div>
      </div>
    );
  }

  // Main form UI
  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-50/50 to-blue-50/30">
      <div className="max-w-4xl mx-auto">
        <div className="p-8 bg-white/80 rounded-2xl shadow-xl border border-white/50 backdrop-blur-sm">
          {/* Header and instructions */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-[#F69122] to-[#912ABD]" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#166FB5] to-[#4038AF] bg-clip-text text-transparent">
                Project Information Form
              </h1>
            </div>
            <div className="p-6 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <p className="text-slate-700 leading-relaxed">
                Thank you for partnering with Philippine Genome Center Visayas. To better understand and support your project, please fill out this form.
              </p>
            </div>
          </div>

          {/* Project form fields */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Project Title */}
              <div className="md:col-span-2">
                <Label>Project Title <span className="text-[#B9273A]">*</span></Label>
                <Input
                  value={formData.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange("title", e.target.value)}
                  placeholder="Enter your project title"
                />
                {errors.title && <p className="text-[#B9273A] text-sm mt-1">{errors.title}</p>}
              </div>

              {/* Project Lead */}
              <div>
                <Label>Project Lead <span className="text-[#B9273A]">*</span></Label>
                <Input
                  value={formData.projectLead}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange("projectLead", e.target.value)}
                  placeholder="Enter project lead name"
                />
                {errors.projectLead && <p className="text-[#B9273A] text-sm mt-1">{errors.projectLead}</p>}
              </div>

              {/* Start Date */}
              <div>
                <Label>Start Date <span className="text-[#B9273A]">*</span></Label>
                <Popover open={startOpen} onOpenChange={setStartOpen}>
                  <PopoverTrigger asChild>
                    <div className="relative w-full">
                      <Input
                        value={formatDate(formData.startDate)}
                        readOnly
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
                      >
                        <CalendarIcon className="size-4 text-[#166FB5]" />
                      </Button>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 border border-slate-200 bg-white/90 backdrop-blur-sm">
                    <Calendar
                      mode="single"
                      selected={formData.startDate}
                      fromYear={2000}
                      toYear={new Date().getFullYear() + 10}
                      onSelect={(date: Date | undefined) => {
                        handleChange("startDate", date);
                        setStartOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
                {errors.startDate && <p className="text-[#B9273A] text-sm mt-1">{errors.startDate}</p>}
              </div>
            </div>

            {/* Sending Institution */}
            <div>
              <Label>Sending Institution <span className="text-[#B9273A]">*</span></Label>
              <Select
                value={formData.sendingInstitution}
                onValueChange={(val: string) => handleChange("sendingInstitution", val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select sending institution" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UP System">UP System</SelectItem>
                  <SelectItem value="SUC/HEI">SUC/HEI</SelectItem>
                  <SelectItem value="Government">Government</SelectItem>
                  <SelectItem value="Private/Local">Private/Local</SelectItem>
                  <SelectItem value="International">International</SelectItem>
                  <SelectItem value="N/A">N/A</SelectItem>
                </SelectContent>
              </Select>
              {errors.sendingInstitution && <p className="text-[#B9273A] text-sm mt-1">{errors.sendingInstitution}</p>}
            </div>

            {/* Funding Institution */}
            <div>
              <Label>Funding Institution <span className="text-[#B9273A]">*</span></Label>
              <Input
                value={formData.fundingInstitution}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange("fundingInstitution", e.target.value)}
                placeholder="Enter funding institution"
              />
              {errors.fundingInstitution && <p className="text-[#B9273A] text-sm mt-1">{errors.fundingInstitution}</p>}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-6 border-t border-slate-100">
              <Button
                type="submit"
                className="h-12 px-8 bg-gradient-to-r from-[#166FB5] to-[#4038AF] hover:from-[#166FB5]/90 hover:to-[#4038AF]/90 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"

              >
                Submit
              </Button>
            </div>
          </form>
        </div>
      </div>
      {/* Confirmation Modal: Review project info before final submit */}
      <ConfirmationModalLayout
        open={showConfirmModal}
        onConfirm={handleConfirmSave}
        onCancel={handleCancelModal}
        loading={false}
        title="Please double check before saving"
        description="Review your project information below before confirming. This action cannot be undone."
        confirmLabel="Confirm & Submit"
        cancelLabel="Go Back"
      >
        {pendingData && (
          <div className="space-y-2 text-slate-800 text-sm">
            <div><span className="font-semibold">Project Title:</span> {pendingData.title}</div>
            <div><span className="font-semibold">Project Lead:</span> {pendingData.projectLead}</div>
            <div><span className="font-semibold">Start Date:</span> {formatDate(pendingData.startDate)}</div>
            <div><span className="font-semibold">Sending Institution:</span> {pendingData.sendingInstitution}</div>
            <div><span className="font-semibold">Funding Institution:</span> {pendingData.fundingInstitution}</div>
          </div>
        )}
      </ConfirmationModalLayout>
    </div>
  );
}