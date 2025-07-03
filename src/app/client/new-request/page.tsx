"use client";

import { useState } from "react";
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
    institution: "",
    designation: "",
    sex: "Male",
    mobileNumber: "",
    institutionAddress: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ClientFormData, string>>>({});

  const handleChange = (field: keyof ClientFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

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
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto p-4">
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
        <Label>Affiliation (Department & Institution) </Label>
        <Input
          value={formData.institution}
          onChange={(e) => handleChange("institution", e.target.value)}
          placeholder="e.g. Division of Biological Sciences - UPV CAS"
        />
        {errors.institution && <p className="text-red-500 text-sm">{errors.institution}</p>}
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
        <Label>Mobile Number</Label>
        <Input
          value={formData.mobileNumber}
          onChange={(e) => handleChange("mobileNumber", e.target.value)}
          placeholder="e.g. 09091234567"
        />
        {errors.mobileNumber && <p className="text-red-500 text-sm">{errors.mobileNumber}</p>}
      </div>

      <div>
        <Label>Institution Address</Label>
        <Textarea
          value={formData.institutionAddress}
          onChange={(e) => handleChange("institutionAddress", e.target.value)}
          placeholder="Enter institution address here"
        />
      </div>

      <Button type="submit" className="w-full">
        Submit
      </Button>
    </form>
  );
}
