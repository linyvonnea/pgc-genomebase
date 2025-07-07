"use client";

import { useState } from "react";
import { z } from "zod";
import { projectSchema, ProjectFormData } from "@/schemas/projectSchema"; 
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

export default function ProjectForm() {
  const [formData, setFormData] = useState<ProjectFormData>({
    title: "",
    projectLead: "",
    startDate: new Date(),
    endDate: null,
    sendingInstitution: "",
    fundingInstitution: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ProjectFormData, string>>>({});
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const handleChange = (field: keyof ProjectFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = projectSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ProjectFormData, string>> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof ProjectFormData;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
    } else {
      setErrors({});
      const formattedData = {
        ...result.data,
        startDate: result.data.startDate ? format(result.data.startDate, "MMMM dd, yyyy") : "",
        endDate: result.data.endDate ? format(result.data.endDate, "MMMM dd, yyyy") : "",
      };
      console.log("Valid data:", formattedData);
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
  function isValidDate(date: Date | null) {
    if (!date) return false;
    return !isNaN(date.getTime());
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
        <Label>
          Project Title <span className="text-red-500 text-sm">*</span>
        </Label>
        <Input
          value={formData.title}
          onChange={(e) => handleChange("title", e.target.value)}
          placeholder="Enter project title here"
        />
        {errors.title && <p className="text-red-500 text-sm">{errors.title}</p>}
      </div>
      <div>
        <Label>
          Project Lead <span className="text-red-500 text-sm">*</span>
        </Label>
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
            <Input
              id="startDate"
              value={formatDate(formData.startDate)}
              placeholder="June 01, 2025"
              className="bg-background pr-10"
              onChange={(e) => {
                const date = new Date(e.target.value);
                handleChange("startDate", isValidDate(date) ? date : formData.startDate);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setStartOpen(true);
                }
              }}
            />
            <Popover open={startOpen} onOpenChange={setStartOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="start-date-picker"
                  variant="ghost"
                  className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
                >
                  <CalendarIcon className="size-3.5" />
                  <span className="sr-only">Select date</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto overflow-hidden p-0" align="end" alignOffset={-8} sideOffset={10}>
                <Calendar
                  mode="single"
                  selected={formData.startDate}
                  captionLayout="dropdown"
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
        <div className="flex-1">
          <Label htmlFor="endDate">
            End Date
          </Label>
          <div className="relative flex gap-2">
            <Input
              id="endDate"
              value={formatDate(formData.endDate)}
              placeholder="June 01, 2025"
              className="bg-background pr-10"
              onChange={(e) => {
                const date = new Date(e.target.value);
                handleChange("endDate", isValidDate(date) ? date : formData.endDate);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setEndOpen(true);
                }
              }}
            />
            <Popover open={endOpen} onOpenChange={setEndOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="end-date-picker"
                  variant="ghost"
                  className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
                >
                  <CalendarIcon className="size-3.5" />
                  <span className="sr-only">Select date</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto overflow-hidden p-0" align="end" alignOffset={-8} sideOffset={10}>
                <Calendar
                  mode="single"
                  selected={formData.endDate || undefined}
                  captionLayout="dropdown"
                  month={formData.endDate || formData.startDate}
                  onMonthChange={(date) => handleChange("endDate", date)}
                  onSelect={(date) => {
                    handleChange("endDate", date);
                    setEndOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
          {errors.endDate && <p className="text-red-500 text-sm">{errors.endDate}</p>}
        </div>
      </div>
      <div>
        <Label>
          Sending Institution <span className="text-red-500 text-sm">*</span>
        </Label>
        <Input
          value={formData.sendingInstitution}
          onChange={(e) => handleChange("sendingInstitution", e.target.value)}
          placeholder="Enter sending institution here"
        />
        {errors.sendingInstitution && <p className="text-red-500 text-sm">{errors.sendingInstitution}</p>}
      </div>
      <div>
        <Label>
          Funding Institution <span className="text-red-500 text-sm">*</span>
        </Label>
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
