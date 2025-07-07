"use client";

import { useState } from "react";
import { useRouter } from 'next/navigation';
import { z } from "zod";
import { clientSchema, ClientFormData } from "@/schemas/clientSchema"; 
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

export default function ClientForm() {
  const [formData, setFormData] = useState<ClientFormData>({
    name: "",
    email: "",
    affiliation: "",
    designation: "",
    sex: "Male",
    mobileNumber: "",
    affiliationAddress: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ClientFormData, string>>>({});

  const handleChange = (field: keyof ClientFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const router = useRouter();
  const handleSubmit = (e: React.FormEvent) => {
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
      console.log("Valid data:", result.data);
      router.push('/client/project-info'); 
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Client Information Form</h1>
          
          <div className="mb-4">
            <p className="text-gray-600 leading-relaxed text-justify mb-6">
              To help us serve you better, please complete this form
              with accurate and updated details. Your information will be handled with 
              strict confidentiality and will only be used for official purposes related 
              to your request, project, or collaboration with PGC.
            </p>
            </div>

    <form onSubmit={handleSubmit} className="space-y-4 w-full p-1">
      <div>
        <Label>
          Name <span className="text-red-500 text-sm">*</span>
        </Label>
        <Input
          value={formData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="Enter name here"
        />
        {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
      </div>

      <div>
        <Label>
          Email <span className="text-red-500 text-sm">*</span>
        </Label>
        <Input
          value={formData.email}
          onChange={(e) => handleChange("email", e.target.value)}
          placeholder="Enter email here"
        />
        {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
      </div>

      <div>
        <Label>
          Affiliation (Department & Institution) <span className="text-red-500 text-sm">*</span>
        </Label>
        <Input
          value={formData.affiliation}
          onChange={(e) => handleChange("affiliation", e.target.value)}
          placeholder="e.g. Division of Biological Sciences - UPV CAS"
        />
        {errors.affiliation && <p className="text-red-500 text-sm">{errors.affiliation}</p>}
      </div>

      <div>
        <Label>
          Designation <span className="text-red-500 text-sm">*</span>
        </Label>
        <Input
          value={formData.designation}
          onChange={(e) => handleChange("designation", e.target.value)}
          placeholder="Enter designation here"
        />
        {errors.designation && <p className="text-red-500 text-sm">{errors.designation}</p>}
      </div>

      <div>
        <Label>
          Sex <span className="text-red-500 text-sm">*</span>
        </Label>
        <Select value={formData.sex} onValueChange={(val) => handleChange("sex", val)}>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Male">Male</SelectItem>
            <SelectItem value="Female">Female</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>
          Mobile Number <span className="text-red-500 text-sm">*</span>
        </Label>
        <Input
          value={formData.mobileNumber}
          onChange={(e) => handleChange("mobileNumber", e.target.value)}
          placeholder="e.g. 09091234567"
        />
        {errors.mobileNumber && <p className="text-red-500 text-sm">{errors.mobileNumber}</p>}
      </div>

      <div>
        <Label>
          Affiliation Address <span className="text-red-500 text-sm">*</span>
        </Label>
        <Textarea
          value={formData.affiliationAddress}
          onChange={(e) => handleChange("affiliationAddress", e.target.value)}
          placeholder="Enter affiliation address here"
        />
        {errors.affiliationAddress && <p className="text-red-500 text-sm">{errors.affiliationAddress}</p>}
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
