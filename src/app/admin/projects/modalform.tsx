// Admin Project Form Modal
// Modal form for adding or editing a project in the admin dashboard, with validation and Firestore integration.

'use client'

import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { FolderPlus, FileText, Building2, Banknote, Briefcase, Save } from "lucide-react";
import { Project } from "@/types/Project";
import { projectSchema as baseProjectSchema } from "@/schemas/projectSchema";
import { collection, addDoc, serverTimestamp, Timestamp, FieldValue, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase"; 
import { toast } from "sonner";
import { getNextPid, checkPidExists } from "@/services/projectsService";
import { getInquiries } from "@/services/inquiryService";
import { Inquiry } from "@/types/Inquiry";
import { logActivity } from "@/services/activityLogService";
import { getActiveCatalogItems } from "@/services/catalogSettingsService";
import useAuth from "@/hooks/useAuth";

// Extend the base project schema for form validation
const projectSchema = baseProjectSchema.extend({
  pid: z.string().optional(),
  iid: z.string().optional(),
  year: z.coerce.number().int().min(2000),
  clientNames: z.string().optional().transform((val) => val && val.trim() ? val.split(",").map((v) => v.trim()) : []),
  projectTag: z.string().optional(),
  status: z.enum(["Ongoing", "Completed", "Cancelled"]).optional(),
  fundingCategory: z.enum(["External", "In-House"]).optional(),
  serviceRequested: z.array(z.string()).optional(),
  personnelAssigned: z.string().optional(),
  notes: z.string().optional(),
  startDate: z.string().optional(),
  lead: z.string().optional(),
  title: z.string().optional(),
  sendingInstitution: z.string().optional(),
  fundingInstitution: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

// Form state type with string for clientNames (before transform)
type ProjectFormState = Omit<ProjectFormData, 'clientNames'> & {
  clientNames: string;
};

export function ProjectFormModal({ onSubmit }: { onSubmit?: (data: Project) => void }) {
  const { adminInfo } = useAuth();
  const pidInputRef = useRef<HTMLInputElement>(null);
  
  // Form state for all project fields
  const [formData, setFormData] = useState<ProjectFormState>({
    pid: "",
    iid: "",
    year: new Date().getFullYear(),
    startDate: new Date().toISOString().substring(0, 10),
    lead: "",
    clientNames: "", // Keep as string for the input field
    title: "",
    projectTag: "",
    status: undefined,
    sendingInstitution: "",
    fundingCategory: undefined,
    fundingInstitution: "",
    serviceRequested: [],
    personnelAssigned: "",
    notes: "",
  });
  // Error state for validation messages
  const [errors, setErrors] = useState<Partial<Record<keyof ProjectFormState, string>>>({});
  
  // Inquiry dropdown state
  const [inquiryOptions, setInquiryOptions] = useState<Inquiry[]>([]);
  const [inquirySearch, setInquirySearch] = useState("");
  
  // Personnel options from catalog settings
  const [personnelOptions, setPersonnelOptions] = useState<string[]>([]);
  
  // PID validation state
  const [isPidChecking, setIsPidChecking] = useState(false);
  const [pidError, setPidError] = useState<string>("");

  // Fetch inquiry options and personnel options
  useEffect(() => {
    getInquiries().then((inquiries) => {
      setInquiryOptions(inquiries);
    });
    getActiveCatalogItems("personnelAssigned").then((personnel) => {
      setPersonnelOptions(personnel);
    });
  }, []);

  // Auto-generate PID when year changes
  useEffect(() => {
    const generatePid = async () => {
      if (formData.year) {
        try {
          const nextPid = await getNextPid(formData.year);
          setFormData((prev) => ({ ...prev, pid: nextPid }));
          setPidError("");
        } catch (err) {
          console.error("Failed to generate PID:", err);
        }
      }
    };
    generatePid();
  }, [formData.year]);

  // Filter inquiry options by search
  const filteredInquiryOptions = inquiryOptions.filter(
    (inq) =>
      inq.id?.toLowerCase().includes(inquirySearch.toLowerCase()) ||
      inq.name?.toLowerCase().includes(inquirySearch.toLowerCase()) ||
      inq.affiliation?.toLowerCase().includes(inquirySearch.toLowerCase())
  );

  // Mutation for adding/updating a project in Firestore
  const mutation = useMutation({
    mutationFn: async (data: Project & { userInfo?: { name: string; email: string } }) => {
      if (!data.pid) throw new Error("Project ID is required");
      const docRef = doc(db, "projects", data.pid);
      const projectData = {
        ...data,
        startDate: Timestamp.fromDate(new Date(data.startDate ?? "")),
        createdAt: serverTimestamp(),
      };
      // Remove userInfo from projectData before saving
      delete (projectData as any).userInfo;
      
      await setDoc(docRef, projectData);
      
      // Log the activity
      await logActivity({
        userId: data.userInfo?.email || "system",
        userEmail: data.userInfo?.email || "system@pgc.admin",
        userName: data.userInfo?.name || "System",
        action: "CREATE",
        entityType: "project",
        entityId: data.pid,
        entityName: data.title || data.pid,
        description: `Created project: ${data.title || data.pid}`,
        changesAfter: projectData,
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

  // Handle form submission: validate, generate PID, and submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate PID
    if (!formData.pid) {
      setPidError("Project ID is required");
      return;
    }
    
    // Check if PID already exists
    setIsPidChecking(true);
    const pidExists = await checkPidExists(formData.pid);
    setIsPidChecking(false);
    
    if (pidExists) {
      setPidError("This Project ID already exists. Please choose a different ID.");
      // Scroll to the PID field and focus it
      pidInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      pidInputRef.current?.focus();
      return;
    }
    
    const result = projectSchema.safeParse(formData);
    if (!result.success) {
      // Collect and display validation errors
      const fieldErrors: Partial<Record<keyof ProjectFormState, string>> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof ProjectFormState;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
    } else {
      setErrors({});
      try {
        // Prepare clean data for Firestore
        // Exclude any parsed createdAt (which may be a string) so we don't assign an incompatible type;
        // Firestore will set createdAt via serverTimestamp() in the mutation function.
        const { createdAt, ...rest } = result.data as any;
        const cleanData: Project = {
          ...rest,
          pid: formData.pid,
          year: Number(result.data.year),
          clientNames: result.data.clientNames,
          serviceRequested: result.data.serviceRequested,
          lead: result.data.lead,
          notes: result.data.notes || "",
          sendingInstitution: (
            [
              "UP System",
              "SUC/HEI",
              "Government",
              "Private/Local",
              "International",
              "N/A"
            ].includes(result.data.sendingInstitution as string)
              ? result.data.sendingInstitution
              : "Government"
          ) as Project["sendingInstitution"],
          // ensure createdAt matches Project type (Date | undefined); Firestore will populate this server-side
          createdAt: undefined,
          userInfo: adminInfo ? { name: adminInfo.name, email: adminInfo.email } : undefined,
        } as Project & { userInfo?: { name: string; email: string } };
        mutation.mutate(cleanData);
      } catch (err) {
        toast.error("Failed to generate project ID.");
        console.error("PID generation failed:", err);
      }
    }
  };

  // Handle text/textarea input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear PID error when user edits the PID
    if (name === "pid") {
      setPidError("");
    }
  };

  // Handle select dropdown changes
  const handleSelect = (field: keyof ProjectFormState, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Dropdown options for serviceRequested
  const serviceOptions = [
    "Laboratory Services",
    "Retail Services",
    "Equipment Use",
    "Bioinformatics Analysis",
    "Training"
  ];

  // Handle checkbox changes for serviceRequested
  const handleServiceCheckbox = (service: string) => {
    setFormData((prev) => {
      const selected = prev.serviceRequested || [];
      if (selected.includes(service)) {
        return { ...prev, serviceRequested: selected.filter((s) => s !== service) };
      } else {
        return { ...prev, serviceRequested: [...selected, service] };
      }
    });
  };

  // Render the project form
  return (
    <form className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4" onSubmit={handleSubmit}>
      {/* Basic Information Section */}
      <div className="col-span-2">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-blue-50 rounded-md">
            <FileText className="h-4 w-4 text-blue-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-700">Basic Information</h3>
        </div>
        <Separator className="mb-3" />
      </div>
      
      {/* Year, Project ID, and Start Date in one row */}
      <div className="col-span-2 grid grid-cols-[100px_1fr_1fr] gap-4">
        {/* Year */}
        <div>
          <Label className="text-xs">Year</Label>
          <Input type="number" name="year" value={formData.year} onChange={handleChange} className="h-9" />
          {errors.year && <p className="text-red-500 text-xs mt-1">{errors.year}</p>}
        </div>
        {/* Project ID - Editable */}
        <div>
          <Label className="text-xs">Project ID</Label>
          <Input 
            ref={pidInputRef}
            name="pid" 
            value={formData.pid} 
            onChange={handleChange} 
            className="h-9 font-mono bg-blue-50" 
            placeholder="P-2026-001"
          />
          {pidError && <p className="text-red-500 text-xs mt-1">{pidError}</p>}
          {errors.pid && <p className="text-red-500 text-xs mt-1">{errors.pid}</p>}
          <p className="text-xs text-gray-500 mt-1">Auto-generated, but can be edited</p>
        </div>
        {/* Start Date */}
        <div>
          <Label className="text-xs">Start Date</Label>
          <Input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className="h-9" />
          {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
        </div>
      </div>

      {/* Project Title - Full Width */}
      <div className="col-span-2">
        <Label className="text-xs">Project Title</Label>
        <Input name="title" value={formData.title} onChange={handleChange} className="h-9" placeholder="Enter project title" />
        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
      </div>

      {/* Project Lead */}
      <div>
        <Label className="text-xs">Project Lead</Label>
        <Input name="lead" value={formData.lead} onChange={handleChange} className="h-9" placeholder="Juan dela Cruz" />
        {errors.lead && <p className="text-red-500 text-xs mt-1">{errors.lead}</p>}
      </div>
      {/* Inquiry ID */}
      <div>
        <Label className="text-xs">Inquiry ID</Label>
        <Select value={formData.iid} onValueChange={(val) => handleSelect("iid", val)}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select inquiry">
              {formData.iid ? (
                <div className="flex flex-col items-start" title={inquiryOptions.find(i => i.id === formData.iid)?.name}>
                  <span className="font-medium text-sm">{formData.iid}</span>
                  {inquiryOptions.find(i => i.id === formData.iid)?.name && (
                    <span className="text-xs text-gray-500 truncate max-w-[200px]">
                      {inquiryOptions.find(i => i.id === formData.iid)?.name}
                    </span>
                  )}
                </div>
              ) : (
                "Select inquiry"
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-[300px] w-[400px]">
            <div className="sticky top-0 bg-white z-10 p-2 border-b">
              <Input
                placeholder="Search by ID, Name, or Affiliation..."
                value={inquirySearch}
                onChange={e => setInquirySearch(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="max-h-[240px] overflow-y-auto">
              {filteredInquiryOptions.length > 0 ? (
                filteredInquiryOptions.map((inq) => (
                  <SelectItem key={inq.id} value={inq.id || ""} className="text-sm">
                    <div className="flex flex-col py-1">
                      <span className="font-medium text-gray-900">{inq.id}</span>
                      <span className="text-xs text-gray-600">{inq.name}</span>
                      {inq.affiliation && (
                        <span className="text-xs text-gray-500 truncate max-w-[350px]" title={inq.affiliation}>
                          {inq.affiliation}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))
              ) : (
                <div className="p-3 text-sm text-center text-gray-500">
                  No inquiries found
                </div>
              )}
            </div>
          </SelectContent>
        </Select>
        {errors.iid && <p className="text-red-500 text-xs mt-1">{errors.iid}</p>}
      </div>

      {/* Project Tag */}
      <div>
        <Label className="text-xs">Project Tag</Label>
        <Input name="projectTag" value={formData.projectTag} onChange={handleChange} className="h-9" placeholder="Enter project tag" />
        {errors.projectTag && <p className="text-red-500 text-xs mt-1">{errors.projectTag}</p>}
      </div>
      {/* Status dropdown */}
      <div>
        <Label className="text-xs">Status</Label>
        <Select value={formData.status || ""} onValueChange={val => handleSelect("status", val)}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Select status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Ongoing">Ongoing</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        {errors.status && <p className="text-red-500 text-xs mt-1">{errors.status}</p>}
      </div>

      {/* Funding Section */}
      <div className="col-span-2 mt-2">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-emerald-50 rounded-md">
            <Banknote className="h-4 w-4 text-emerald-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-700">Funding & Institution</h3>
        </div>
        <Separator className="mb-3" />
      </div>

      {/* Sending Institution */}
      <div>
        <Label className="text-xs">Sending Institution</Label>
        <Select value={formData.sendingInstitution || ""} onValueChange={val => handleSelect("sendingInstitution", val)}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Select institution" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="UP System">UP System</SelectItem>
            <SelectItem value="SUC/HEI">SUC/HEI</SelectItem>
            <SelectItem value="Government">Government</SelectItem>
            <SelectItem value="Private/Local">Private/Local</SelectItem>
            <SelectItem value="International">International</SelectItem>
            <SelectItem value="N/A">N/A</SelectItem>
          </SelectContent>
        </Select>
        {errors.sendingInstitution && <p className="text-red-500 text-xs mt-1">{errors.sendingInstitution}</p>}
      </div>
      {/* Funding Category dropdown */}
      <div>
        <Label className="text-xs">Funding Category</Label>
        <Select value={formData.fundingCategory || ""} onValueChange={val => handleSelect("fundingCategory", val)}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Select Funding Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="External">External</SelectItem>
            <SelectItem value="In-House">In-House</SelectItem>
          </SelectContent>
        </Select>
        {errors.fundingCategory && <p className="text-red-500 text-xs mt-1">{errors.fundingCategory}</p>}
      </div>

      {/* Funding Institution - Full Width */}
      <div className="col-span-2">
        <Label className="text-xs">Funding Institution</Label>
        <Input name="fundingInstitution" value={formData.fundingInstitution || ""} onChange={handleChange} className="h-9" placeholder="Enter funding institution" />
        {errors.fundingInstitution && <p className="text-red-500 text-xs mt-1">{errors.fundingInstitution}</p>}
      </div>

      {/* Services Section */}
      <div className="col-span-2 mt-2">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-purple-50 rounded-md">
            <Briefcase className="h-4 w-4 text-purple-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-700">Services & Personnel</h3>
        </div>
        <Separator className="mb-3" />
      </div>

      {/* Service Requested checkboxes - Horizontal layout */}
      <div className="col-span-2">
        <Label className="text-xs">Service Requested</Label>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
          {serviceOptions.map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formData.serviceRequested?.includes(option) || false}
                onChange={() => handleServiceCheckbox(option)}
                className="h-4 w-4"
              />
              {option}
            </label>
          ))}
        </div>
        {errors.serviceRequested && <p className="text-red-500 text-xs mt-1">{errors.serviceRequested}</p>}
      </div>

      {/* Personnel Assigned - Full Width */}
      <div className="col-span-2">
        <Label className="text-xs">Personnel Assigned</Label>
        <Select value={formData.personnelAssigned || ""} onValueChange={val => handleSelect("personnelAssigned", val)}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Select personnel" /></SelectTrigger>
          <SelectContent>
            {personnelOptions.length > 0 ? (
              personnelOptions.map((person) => (
                <SelectItem key={person} value={person}>{person}</SelectItem>
              ))
            ) : (
              <SelectItem value="" disabled>No personnel available</SelectItem>
            )}
          </SelectContent>
        </Select>
        {errors.personnelAssigned && <p className="text-red-500 text-xs mt-1">{errors.personnelAssigned}</p>}
      </div>

      {/* Notes - Full Width */}
      <div className="col-span-2">
        <Label className="text-xs">Notes</Label>
        <Textarea name="notes" value={formData.notes || ""} onChange={handleChange} rows={3} className="resize-none" placeholder="Enter additional notes" />
        {errors.notes && <p className="text-red-500 text-xs mt-1">{errors.notes}</p>}
      </div>

      {/* Submit button */}
      <div className="col-span-2 flex justify-end gap-3 mt-2 pt-3">
        <Separator className="mb-4" />
        <Button 
          type="button" 
          variant="outline" 
          onClick={onSubmit ? () => window.location.reload() : undefined}
          disabled={mutation.isPending || isPidChecking}
          className="min-w-[100px]"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={mutation.isPending || isPidChecking} 
          className="px-6 min-w-[140px] bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md"
        >
          {isPidChecking ? (
            <>
              <span className="mr-2">Checking ID...</span>
              <span className="animate-spin">⏳</span>
            </>
          ) : mutation.isPending ? (
            <>
              <span className="mr-2">Saving...</span>
              <span className="animate-spin">⏳</span>
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Project
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
