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
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";



export default function ProjectForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pid = searchParams.get("pid");
  const cid = searchParams.get("cid");

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

  // Fetch existing project data on mount
  useEffect(() => {
    async function fetchProject() {
      if (!pid) {
        setLoading(false); // If no pid, stop loading and show form
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
            startDate: data.startDate ? (data.startDate.toDate ? data.startDate.toDate() : new Date(data.startDate)) : new Date(),
            sendingInstitution: data.sendingInstitution || "",
            fundingInstitution: data.fundingInstitution || "",
          });
        }
      } catch (err) {
        toast.error("Failed to load project data.");
      } finally {
        setLoading(false);
      }
    }
    fetchProject();
  }, [pid]);

  const handleChange = (field: keyof ProjectFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

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
    if (!pid) {
      toast.error("Missing project ID in URL.");
      return;
    }
    try {
      const year = result.data.startDate.getFullYear();
      const docRef = doc(db, "projects", pid);
      
      // Fetch client name if cid exists
      let clientName = "";
      if (cid) {
        const clientDoc = await getDoc(doc(db, "clients", cid));
        if (clientDoc.exists()) {
          clientName = clientDoc.data().name || "";
        }
      }

      // Fetch the existing project to check for createdAt and existing clientNames
      const snap = await getDoc(docRef);
      let createdAt = serverTimestamp();
      let existingClientNames: string[] = [];
      
      if (snap.exists()) {
        if (snap.data().createdAt) {
          createdAt = snap.data().createdAt;
        }
        existingClientNames = snap.data().clientNames || [];
      }

      // Add new client name if it exists and isn't already in the array
      const updatedClientNames = clientName && !existingClientNames.includes(clientName) 
        ? [...existingClientNames, clientName]
        : existingClientNames;

      const payload = {
        pid: pid || "",
        iid: "", // Set iid as empty string
        year,
        startDate: Timestamp.fromDate(result.data.startDate),
        createdAt,
        lead: result.data.projectLead || "",
        clientNames: updatedClientNames, // Use updated client names array
        title: result.data.title || "",
        projectTag: "",
        status: "",
        sendingInstitution: result.data.sendingInstitution || "",
        fundingCategory: "",
        fundingInstitution: result.data.fundingInstitution || "",
        serviceRequested: [],
        personnelAssigned: "",
        notes: "",
      };
      
      await setDoc(docRef, payload, { merge: true });
      toast.success("Project updated successfully!");
      // Optionally redirect or do something else
    } catch (err) {
      toast.error("Error updating project. Please try again.");
    }
  };

  function formatDate(date: Date | null) {
    if (!date) return "";
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  if (loading) {
    return <div className="max-w-4xl mx-auto p-8">Loading project data...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Project Information Form</h1>

        <div className="mb-4">
          <p className="text-gray-600 leading-relaxed text-justify mb-6">
            Thank you for partnering with Philippine Genome Center Visayas.
            To better understand and support your project, we request that you 
            provide information through this form.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 w-full p-1">
          <div>
            <Label>Project Title <span className="text-red-500 text-sm">*</span></Label>
            <Input
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="Enter project title here"
            />
            {errors.title && <p className="text-red-500 text-sm">{errors.title}</p>}
          </div>

          <div>
            <Label>Project Lead <span className="text-red-500 text-sm">*</span></Label>
            <Input
              value={formData.projectLead}
              onChange={(e) => handleChange("projectLead", e.target.value)}
              placeholder="Enter project lead here"
            />
            {errors.projectLead && <p className="text-red-500 text-sm">{errors.projectLead}</p>}
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="startDate">
                Start Date <span className="text-red-500 text-sm">*</span>
              </Label>
              <div className="relative flex gap-2">
                <Popover open={startOpen} onOpenChange={setStartOpen}>
                  <PopoverTrigger asChild>
                    <div className="relative w-full">
                      <Input
                        id="startDate"
                        value={formatDate(formData.startDate)}
                        placeholder="June 01, 2025"
                        className="bg-background pr-10 w-full"
                        readOnly
                      />
                      <Button
                        variant="ghost"
                        className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
                        type="button"
                      >
                        <CalendarIcon className="size-4" />
                        <span className="sr-only">Select date</span>
                      </Button>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto overflow-hidden p-0"
                    align="end"
                    alignOffset={-8}
                    sideOffset={10}
                  >
                    <Calendar
                      mode="single"
                      selected={formData.startDate}
                      captionLayout="dropdown"
                      fromYear={2000}
                      toYear={new Date().getFullYear() + 10} 
                      month={formData.startDate}
                      onMonthChange={(date) => handleChange("startDate", date)}
                      onSelect={(date) => {
                        handleChange("startDate", date);
                        setStartOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              {errors.startDate && <p className="text-red-500 text-sm">{errors.startDate}</p>}
            </div>
          </div>

          <div>
            <Label>Sending Institution <span className="text-red-500 text-sm">*</span></Label>
            <Select
              value={formData.sendingInstitution}
              onValueChange={(value) => handleChange("sendingInstitution", value)}
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
            {errors.sendingInstitution && <p className="text-red-500 text-sm">{errors.sendingInstitution}</p>}
          </div>

          <div>
            <Label>Funding Institution <span className="text-red-500 text-sm">*</span></Label>
            <Input
              value={formData.fundingInstitution}
              onChange={(e) => handleChange("fundingInstitution", e.target.value)}
              placeholder="Enter funding institution here"
            />
            {errors.fundingInstitution && <p className="text-red-500 text-sm">{errors.fundingInstitution}</p>}
          </div>

          <div className="flex justify-end pt-6">
            <Button 
              type="submit" 
              className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-2"
            >
              Submit
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

//test
