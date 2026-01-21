// Admin Client Modal Form
// Modal form for adding a new client in the admin panel, with project linking and validation.

'use client';

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Client } from "@/types/Client";
import { clientSchema as baseClientSchema } from "@/schemas/clientSchema";
import { db } from "@/lib/firebase"; 
import { toast } from "sonner";
import { doc, setDoc, serverTimestamp, updateDoc, arrayUnion } from "firebase/firestore";
import { getNextCid } from "@/services/clientService";
import { getProjects } from "@/services/projectsService";
import { DialogFooter } from "@/components/ui/dialog";

// Extended client schema for admin modal validation
const clientSchema = baseClientSchema.extend({
  affiliation: z.string().min(1, "Affiliation is required"),
  year: z.coerce.number().int().min(2000),
  name: z.string().min(1, "Name is required"),
  sex: z.enum(["F", "M", "Other"]),
  phoneNumber: z
    .string()
    .refine(
      (val) => /^\d{11}$/.test(val) || val === "N/A",
      "Enter a valid 11-digit number or 'N/A'"
    ),
  designation: z.string().min(1, "Designation is required"),
  email: z.string().email("Invalid email"),
}).omit({ createdAt: true, affiliationAddress: true });

type ClientFormData = z.infer<typeof clientSchema>;

// Modal form component for adding a client
export function ClientFormModal({ onSubmit, onClose }: { onSubmit?: (data: Client) => void; onClose?: () => void }) {
  // Form state
  const [formData, setFormData] = useState<ClientFormData>({
    year: new Date().getFullYear(),
    name: "",
    affiliation: "",
    designation: "",
    email: "",
    sex: "F",
    phoneNumber: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ClientFormData, string>>>({});
  const [projectOptions, setProjectOptions] = useState<{ pid: string; title?: string }[]>([]);
  const [selectedPid, setSelectedPid] = useState<string>("");
  const [projectSearch, setProjectSearch] = useState("");

  // Mutation for saving client to Firestore
  const mutation = useMutation({
    mutationFn: async (data: Client) => {
      if (!data.cid) throw new Error("Client ID is required");
      const docRef = doc(db, "clients", data.cid);
      await setDoc(docRef, {
        ...data,
        createdAt: serverTimestamp(),
      });
      return data;
    },
    onSuccess: (data) => {
      toast.success("Client added successfully!");
      setTimeout(() => {
        onSubmit?.(data);
        onClose?.();
      }, 200);
    },
    onError: (error) => {
      toast.error("Failed to add client.");
      console.error("Firestore insert failed:", error);
    },
  });

  // Fetch project options for dropdown
  useEffect(() => {
    getProjects().then((projects) => {
      setProjectOptions(projects.map((p) => ({ pid: p.pid!, title: p.title })));
    });
  }, []);

  // Handle form submit: validate, save client, update project
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = clientSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ClientFormData, string>> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof ClientFormData;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
    } else {
      setErrors({});
      try {
        // Generate next client ID
        const nextCid = await getNextCid(result.data.year);
        const clientData: Client = {
          ...result.data,
          cid: nextCid,
          year: result.data.year,
          pid: selectedPid,
          // normalize fields that must be boolean | undefined on the Client type
          haveSubmitted: typeof (result.data as any).haveSubmitted === "boolean" ? (result.data as any).haveSubmitted : false,
          isContactPerson: typeof (result.data as any).isContactPerson === "boolean" ? (result.data as any).isContactPerson : false,
        };
        await mutation.mutateAsync(clientData);
        // Update project clientNames array
        if (selectedPid && clientData.name) {
          const projectRef = doc(db, "projects", selectedPid);
          await updateDoc(projectRef, {
            clientNames: arrayUnion(clientData.name)
          });
        }
      } catch (err) {
        toast.error("Failed to generate client ID or update project.");
        console.error("CID generation or project update failed:", err);
      }
    }
  };

  // Handle form field changes
  const handleChange = (
    name: keyof ClientFormData,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Filter project options by search
  const filteredProjectOptions = projectOptions.filter(
    (proj) =>
      proj.pid.toLowerCase().includes(projectSearch.toLowerCase()) ||
      (proj.title?.toLowerCase().includes(projectSearch.toLowerCase()) ?? false)
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Project Information Section */}
      <div className="border-b pb-2">
        <h3 className="text-sm font-semibold text-gray-700">Project Information</h3>
      </div>

      {/* Project ID Dropdown with search */}
      <div>
        <Label className="text-xs">Project ID</Label>
        <Select value={selectedPid} onValueChange={setSelectedPid}>
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder="Select or search project">
              {selectedPid ? (
                <div className="flex flex-col items-start" title={projectOptions.find(p => p.pid === selectedPid)?.title}>
                  <span className="font-medium text-sm">{selectedPid}</span>
                  {projectOptions.find(p => p.pid === selectedPid)?.title && (
                    <span className="text-xs text-gray-500 truncate max-w-[250px]">
                      {projectOptions.find(p => p.pid === selectedPid)?.title}
                    </span>
                  )}
                </div>
              ) : (
                "Select or search project"
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-[300px] w-[400px]">
            <div className="sticky top-0 bg-white z-10 p-2 border-b">
              <Input
                placeholder="Search by Project ID or Title..."
                value={projectSearch}
                onChange={e => setProjectSearch(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="max-h-[240px] overflow-y-auto">
              {filteredProjectOptions.length > 0 ? (
                filteredProjectOptions.map((proj) => (
                  <SelectItem key={proj.pid} value={proj.pid} className="text-sm">
                    <div className="flex flex-col py-1">
                      <span className="font-medium text-gray-900">{proj.pid}</span>
                      {proj.title && (
                        <span className="text-xs text-gray-500 truncate max-w-[350px]" title={proj.title}>
                          {proj.title}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))
              ) : (
                <div className="p-3 text-sm text-center text-gray-500">
                  No projects found
                </div>
              )}
            </div>
          </SelectContent>
        </Select>
      </div>

      {/* Personal Information Section */}
      <div className="border-b pb-2 pt-2">
        <h3 className="text-sm font-semibold text-gray-700">Personal Information</h3>
      </div>

      {/* Name Field */}
      <div>
        <Label className="text-xs">Full Name</Label>
        <Input
          value={formData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="Enter full name"
          className="h-9"
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>

      {/* Email Field */}
      <div>
        <Label className="text-xs">Email Address</Label>
        <Input
          type="email"
          value={formData.email}
          onChange={(e) => handleChange("email", e.target.value)}
          placeholder="Enter email address"
          className="h-9"
        />
        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Sex Field */}
        <div>
          <Label className="text-xs">Sex</Label>
          <Select value={formData.sex} onValueChange={(val) => handleChange("sex", val as ClientFormData["sex"])}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="F">Female</SelectItem>
              <SelectItem value="M">Male</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
          {errors.sex && <p className="text-red-500 text-xs mt-1">{errors.sex}</p>}
        </div>

        {/* Mobile Number Field */}
        <div>
          <Label className="text-xs">Mobile Number</Label>
          <Input
            value={formData.phoneNumber}
            onChange={(e) => handleChange("phoneNumber", e.target.value)}
            placeholder="09091234567"
            className="h-9"
          />
          {errors.phoneNumber && <p className="text-red-500 text-xs mt-1">{errors.phoneNumber}</p>}
        </div>
      </div>

      {/* Professional Information Section */}
      <div className="border-b pb-2 pt-2">
        <h3 className="text-sm font-semibold text-gray-700">Professional Information</h3>
      </div>

      {/* Affiliation Field */}
      <div>
        <Label className="text-xs">Affiliation (Department & Institution)</Label>
        <Input
          value={formData.affiliation}
          onChange={(e) => handleChange("affiliation", e.target.value)}
          placeholder="e.g. Division of Biological Sciences - UPV CAS"
          className="h-9"
        />
        {errors.affiliation && <p className="text-red-500 text-xs mt-1">{errors.affiliation}</p>}
      </div>

      {/* Designation Field */}
      <div>
        <Label className="text-xs">Designation</Label>
        <Input
          value={formData.designation}
          onChange={(e) => handleChange("designation", e.target.value)}
          placeholder="Enter job title or position"
          className="h-9"
        />
        {errors.designation && <p className="text-red-500 text-xs mt-1">{errors.designation}</p>}
      </div>

      {/* Save Button */}
      <DialogFooter className="pt-3 mt-3 border-t">
        <Button type="submit" disabled={mutation.isPending} className="px-6">
          {mutation.isPending ? "Saving..." : "Save Client"}
        </Button>
      </DialogFooter>
    </form>
  );
}
