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

const clientSchema = baseClientSchema.extend({
  affiliation: z.string().min(1, "Affiliation is required"),
  affiliationAddress: z.string().min(1, "Affiliation address is required"),
  year: z.coerce.number().int().min(2000),
  name: z.string().min(1, "Name is required"),
  sex: z.enum(["F", "M", "Other"]),
  phoneNumber: z
    .string()
    .regex(/^\d{11}$/, "Enter a valid 11-digit number with no spaces"),
  designation: z.string().min(1, "Designation is required"),
  email: z.string().email("Invalid email"),
  createdAt: z.date().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

export function ClientFormModal({ onSubmit }: { onSubmit?: (data: Client) => void }) {
  const [formData, setFormData] = useState<ClientFormData>({
    year: new Date().getFullYear(),
    name: "",
    affiliation: "",
    affiliationAddress: "",
    designation: "",
    email: "",
    sex: "F",
    phoneNumber: "",
    createdAt: new Date(),
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ClientFormData, string>>>({});
  const [projectOptions, setProjectOptions] = useState<{ pid: string; title?: string }[]>([]);
  const [selectedPid, setSelectedPid] = useState<string>("");
  const [projectSearch, setProjectSearch] = useState("");
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
      }, 200);
    },
    onError: (error) => {
      toast.error("Failed to add client.");
      console.error("Firestore insert failed:", error);
    },
  });

  useEffect(() => {
    getProjects().then((projects) => {
      setProjectOptions(projects.map((p) => ({ pid: p.pid!, title: p.title })));
    });
  }, []);

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
        const nextCid = await getNextCid(result.data.year);
        const clientData: Client = {
          ...result.data,
          cid: nextCid,
          year: result.data.year,
          pid: selectedPid,
        };
        await mutation.mutateAsync(clientData);
        // Update project clientNames
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

  const handleChange = (
    name: keyof ClientFormData,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const filteredProjectOptions = projectOptions.filter(
    (proj) =>
      proj.pid.toLowerCase().includes(projectSearch.toLowerCase()) ||
      (proj.title?.toLowerCase().includes(projectSearch.toLowerCase()) ?? false)
  );

  return (
    <form onSubmit={handleSubmit}>
      {/* Project ID Dropdown */}
      <div>
        <Label>Project ID</Label>
        <Select value={selectedPid} onValueChange={setSelectedPid}>
          <SelectTrigger>
            <SelectValue placeholder="Select Project ID" />
          </SelectTrigger>
          <SelectContent>
            <div className="p-2">
              <Input
                placeholder="Search Project ID or Title..."
                value={projectSearch}
                onChange={e => setProjectSearch(e.target.value)}
                className="mb-2"
              />
            </div>
            {filteredProjectOptions.map((proj) => (
              <SelectItem key={proj.pid} value={proj.pid}>
                {proj.pid} {proj.title ? `- ${proj.title}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Name</Label>
        <Input
          value={formData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="Enter name here"
        />
        {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
      </div>

      <div>
        <Label>Email</Label>
        <Input
          value={formData.email}
          onChange={(e) => handleChange("email", e.target.value)}
          placeholder="Enter email here"
        />
        {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
      </div>

      <div>
        <Label>Affiliation (Department & Institution)</Label>
        <Input
          value={formData.affiliation}
          onChange={(e) => handleChange("affiliation", e.target.value)}
          placeholder="e.g. Division of Biological Sciences - UPV CAS"
        />
        {errors.affiliation && <p className="text-red-500 text-sm">{errors.affiliation}</p>}
      </div>

      <div>
        <Label>Designation</Label>
        <Input
          value={formData.designation}
          onChange={(e) => handleChange("designation", e.target.value)}
          placeholder="Enter designation here"
        />
        {errors.designation && <p className="text-red-500 text-sm">{errors.designation}</p>}
      </div>

      <div>
        <Label>Sex</Label>
        <Select value={formData.sex} onValueChange={(val) => handleChange("sex", val as ClientFormData["sex"])}>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="F">Female</SelectItem>
            <SelectItem value="M">Male</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
        {errors.sex && <p className="text-red-500 text-sm">{errors.sex}</p>}
      </div>

      <div>
        <Label>Mobile Number</Label>
        <Input
          value={formData.phoneNumber}
          onChange={(e) => handleChange("phoneNumber", e.target.value)}
          placeholder="e.g. 09091234567"
        />
        {errors.phoneNumber && <p className="text-red-500 text-sm">{errors.phoneNumber}</p>}
      </div>

      <div className="mb-4">
        <Label>Affiliation Address</Label>
        <Textarea
          value={formData.affiliationAddress}
          onChange={(e) => handleChange("affiliationAddress", e.target.value)}
          placeholder="Enter affiliation address here"
        />
        {errors.affiliationAddress && <p className="text-red-500 text-sm">{errors.affiliationAddress}</p>}
      </div>

      <DialogFooter>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
}
