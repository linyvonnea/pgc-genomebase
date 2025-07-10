"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { adminProjectSchema, AdminProjectData } from "@/schemas/adminProjectSchema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Pencil, Trash2 } from "lucide-react";
import { Project } from "@/types/Project";
import { db } from "@/lib/firebase";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { editProject } from "@/services/editProject";

interface EditProjectModalProps {
  project: Project;
  onSuccess?: () => void;
}

export function EditProjectModal({ project, onSuccess }: EditProjectModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serviceRequestedInput, setServiceRequestedInput] = useState(
    Array.isArray(project.serviceRequested)
      ? project.serviceRequested.join(", ")
      : project.serviceRequested || ""
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const form = useForm<AdminProjectData>({
    resolver: zodResolver(adminProjectSchema),
    defaultValues: {
      pid: project.pid, // Ensure pid is present for validation
      year: project.year || new Date().getFullYear(),
      startDate: project.startDate ? new Date(project.startDate) : new Date(),
      lead: project.lead || "",
      title: project.title || "",
      projectTag: project.projectTag || "",
      status: project.status || "Ongoing",
      sendingInstitution: project.sendingInstitution || "Government",
      fundingCategory: project.fundingCategory || "In-House",
      fundingInstitution: project.fundingInstitution || "",
      serviceRequested: project.serviceRequested ?? [],
      notes: project.notes || "",
      personnelAssigned: project.personnelAssigned || "",
    },
  });

  useEffect(() => {
    const val = form.getValues("serviceRequested");
    if (Array.isArray(val)) {
      setServiceRequestedInput(val.join(", "));
    } else if (typeof val === "string") {
      setServiceRequestedInput(val);
    } else {
      setServiceRequestedInput("");
    }
  }, [isOpen]);

  const onSubmit = async (data: AdminProjectData) => {
    console.log("Submitting...");
    setIsLoading(true);
    // Ensure pid is present
    const pid = data.pid || project.pid;
    if (!pid) {
      toast.error("Project ID (pid) is missing. Cannot update project.");
      setIsLoading(false);
      return;
    }
    // Ensure serviceRequested is always an array
    let serviceRequested = data.serviceRequested;
    if (typeof serviceRequested === "string") {
      serviceRequested = (serviceRequested as string).split(",").map((s: string) => s.trim()).filter((s: string) => Boolean(s));
    } else if (!Array.isArray(serviceRequested)) {
      serviceRequested = [];
    }
    const updatedData = { ...data, pid, serviceRequested };
    console.log("Submitting to Firestore:", updatedData);
    try {
      await editProject(updatedData);
      toast.success("Project updated successfully!");
      setIsOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error updating project:", error);
      toast.error("Failed to update project. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!project.pid) return;
    try {
      await deleteDoc(doc(db, "projects", project.pid));
      toast.success("Project deleted successfully!");
      setShowDeleteConfirm(false);
      setIsOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Failed to delete project. Please try again.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Update the project information. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit, (errors) => {
              console.error("Form validation errors:", errors);
              toast.error("Please fix the errors in the form.");
            })}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Year</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter year"
                      {...field}
                      onChange={e => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={"w-full justify-start text-left font-normal" + (field.value ? "" : " text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ?
                          new Date(field.value).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })
                          : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={date => field.onChange(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lead"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Lead</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter project lead" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter project title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="projectTag"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Tag</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter project tag" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Ongoing">Ongoing</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sendingInstitution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sending Institution</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select sending institution" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="UP System">UP System</SelectItem>
                      <SelectItem value="SUC/HEI">SUC/HEI</SelectItem>
                      <SelectItem value="Government">Government</SelectItem>
                      <SelectItem value="Private/Local">Private/Local</SelectItem>
                      <SelectItem value="International">International</SelectItem>
                      <SelectItem value="N/A">N/A</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fundingCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Funding Category</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select funding category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="External">External</SelectItem>
                      <SelectItem value="In-House">In-House</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fundingInstitution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Funding Institution</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter funding institution" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="serviceRequested"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Requested</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Comma separated (e.g. Laboratory Services, Bioinformatics Analysis)"
                      value={serviceRequestedInput}
                      onChange={e => setServiceRequestedInput(e.target.value)}
                      onBlur={() => field.onChange(serviceRequestedInput.split(",").map(s => s.trim()).filter(Boolean))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="personnelAssigned"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Personnel Assigned</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter personnel assigned" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter notes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-between items-center pt-4">
              <button
                type="button"
                className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm font-medium bg-transparent border-none p-0 m-0 focus:outline-none"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isLoading}
                style={{ boxShadow: "none", background: "none" }}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsOpen(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading || form.formState.isSubmitting}>
                  {(isLoading || form.formState.isSubmitting) ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </div>
            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
              <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent className="max-w-xs w-full">
                  <DialogHeader>
                    <DialogTitle>Delete Project</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete this project? This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDelete}>
                      Delete
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
