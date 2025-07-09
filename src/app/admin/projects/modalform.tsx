'use client'

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";
import { Project } from "@/types/Project";
import { projectSchema as baseProjectSchema } from "@/schemas/projectSchema";
import { collection, addDoc, serverTimestamp, Timestamp, FieldValue, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase"; 
import { toast } from "sonner";
import { getNextPid } from "@/services/projectsService";



// Extend the Zod schema to match the Project type
const projectSchema = baseProjectSchema.extend({
  pid: z.string().min(1, "Project ID is required"),
  iid: z.string().min(1, "Inquiry ID is required"),
  year: z.coerce.number().int().min(2000),
  clientNames: z.string().min(1).transform((val) => val.split(",").map((v) => v.trim())),
  projectTag: z.string().min(1, "Project Tag is required"),
  status: z.enum(["Ongoing", "Completed", "Cancelled"]),
  fundingCategory: z.string().min(1, "Funding Category is required"),
  serviceRequested: z.string().min(1).transform((val) => val.split(",").map((v) => v.trim())),
  personnelAssigned: z.string().min(1, "Personnel Assigned is required"),
  notes: z.string().optional(),
  startDate: z.string(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

export function ProjectFormModal({ onSubmit }: { onSubmit?: (data: Project) => void }) {
  const [formData, setFormData] = useState<ProjectFormData>({
    pid: "",
    iid: "",
    year: new Date().getFullYear(),
    startDate: new Date().toISOString().substring(0, 10),
    lead: "",
    clientNames: [],
    title: "",
    projectTag: "",
    status: "Ongoing",
    sendingInstitution: "",
    fundingCategory: "",
    fundingInstitution: "",
    serviceRequested: [],
    personnelAssigned: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ProjectFormData, string>>>({});

const mutation = useMutation({
  mutationFn: async (data: Project) => {
    if (!data.pid) throw new Error("Project ID is required");

    const docRef = doc(db, "projects", data.pid);

    await setDoc(docRef, {
    ...data,
    startDate: Timestamp.fromDate(new Date(data.startDate ?? "")),
    createdAt: serverTimestamp(),
  });

    return data;
  },
  onSuccess: (data) => {
    toast.success("Project added successfully!");
    if (onSubmit) onSubmit(data);
  },
  onError: (error) => {
    toast.error("Failed to add project.");
    console.error("Firestore insert failed:", error);
  },
});

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  const result = projectSchema.omit({ pid: true }).safeParse(formData); // omit pid for initial validation
  if (!result.success) {
    const fieldErrors: Partial<Record<keyof ProjectFormData, string>> = {};
    result.error.errors.forEach((err) => {
      const field = err.path[0] as keyof ProjectFormData;
      fieldErrors[field] = err.message;
    });
    setErrors(fieldErrors);
  } else {
    setErrors({});
    try {
      const nextPid = await getNextPid(result.data.year);
      const cleanData: Project = {
        ...result.data,
        pid: nextPid,
        year: Number(result.data.year),
        clientNames: result.data.clientNames,
        serviceRequested: result.data.serviceRequested,
        lead: result.data.lead,
        notes: result.data.notes || "",
      };
      mutation.mutate(cleanData);
    } catch (err) {
      toast.error("Failed to generate project ID.");
      console.error("PID generation failed:", err);
    }
  }
};


    const handleChange = (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      const { name, value } = e.target;
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    };

    const handleSelect = (field: keyof ProjectFormData, value: string) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    };



  return (
    <form className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-4" onSubmit={handleSubmit}>
      <div>
        <Label>Year</Label>
        <Input type="number" name="year" value={formData.year} onChange={handleChange} />
        {errors.year && <p className="text-red-500 text-xs mt-1">{errors.year}</p>}
      </div>
      <div>
        <Label>Start Date</Label>
        <Input type="date" name="startDate" value={formData.startDate} onChange={handleChange} />
        {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
      </div>
      <div>
        <Label>Client Names</Label>
        <Input name="clientNames" placeholder="Separate with comma" value={formData.clientNames} onChange={handleChange} />
        {errors.clientNames && <p className="text-red-500 text-xs mt-1">{errors.clientNames}</p>}
      </div>
      <div>
        <Label>Project Lead</Label>
        <Input name="lead" value={formData.lead} onChange={handleChange} />
        {errors.lead && <p className="text-red-500 text-xs mt-1">{errors.lead}</p>}
      </div>
      <div>
        <Label>Project ID</Label>
        <Input name="pid" value={formData.pid} onChange={handleChange} />
        {errors.pid && <p className="text-red-500 text-xs mt-1">{errors.pid}</p>}
      </div>
      <div>
        <Label>Inquiry ID</Label>
        <Input name="iid" value={formData.iid} onChange={handleChange} />
        {errors.iid && <p className="text-red-500 text-xs mt-1">{errors.iid}</p>}
      </div>
      <div>
        <Label>Project Title</Label>
        <Input name="title" value={formData.title} onChange={handleChange} />
        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
      </div>
      <div>
        <Label>Project Tag</Label>
        <Input name="projectTag" value={formData.projectTag} onChange={handleChange} />
        {errors.projectTag && <p className="text-red-500 text-xs mt-1">{errors.projectTag}</p>}
      </div>
      <div>
        <Label>Status</Label>
        <Select value={formData.status} onValueChange={val => handleSelect("status", val)}>
          <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Ongoing">Ongoing</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        {errors.status && <p className="text-red-500 text-xs mt-1">{errors.status}</p>}
      </div>
      <div>
        <Label>Sending Institution</Label>
        <Input name="sendingInstitution" value={formData.sendingInstitution} onChange={handleChange} />
        {errors.sendingInstitution && <p className="text-red-500 text-xs mt-1">{errors.sendingInstitution}</p>}
      </div>
      <div>
        <Label>Funding Category</Label>
        <Input name="fundingCategory" value={formData.fundingCategory} onChange={handleChange} />
        {errors.fundingCategory && <p className="text-red-500 text-xs mt-1">{errors.fundingCategory}</p>}
      </div>
      <div>
        <Label>Funding Institution</Label>
        <Input name="fundingInstitution" value={formData.fundingInstitution} onChange={handleChange} />
        {errors.fundingInstitution && <p className="text-red-500 text-xs mt-1">{errors.fundingInstitution}</p>}
      </div>
      <div>
        <Label>Service Requested</Label>
        <Input name="serviceRequested" placeholder="Separate with comma" value={formData.serviceRequested} onChange={handleChange} />
        {errors.serviceRequested && <p className="text-red-500 text-xs mt-1">{errors.serviceRequested}</p>}
      </div>
      <div>
        <Label>Personnel Assigned</Label>
        <Input name="personnelAssigned" value={formData.personnelAssigned} onChange={handleChange} />
        {errors.personnelAssigned && <p className="text-red-500 text-xs mt-1">{errors.personnelAssigned}</p>}
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea name="notes" value={formData.notes} onChange={handleChange} />
        {errors.notes && <p className="text-red-500 text-xs mt-1">{errors.notes}</p>}
      </div>
      <DialogFooter className="col-span-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
}
