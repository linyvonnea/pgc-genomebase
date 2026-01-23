"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { adminClientSchema, AdminClientData } from "@/schemas/adminClientSchema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trash2, Pencil, UserCog, User, Mail, Phone, Building2, Briefcase, FolderOpen, Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Client } from "@/types/Client";
import { Project } from "@/types/Project";
import { getProjects } from "@/services/projectsService";
import { updateClientAndProjectName } from "@/services/updateClientAndProjectName";
import { toast } from "sonner";
import { deleteDoc, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { logActivity } from "@/services/activityLogService";
import useAuth from "@/hooks/useAuth";

interface EditClientModalProps {
  client: Client;
  onSuccess?: () => void;
}

export function EditClientModal({ client, onSuccess }: EditClientModalProps) {
  const { adminInfo } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Project dropdown state
  const [projectOptions, setProjectOptions] = useState<Project[]>([]);
  const [projectSearch, setProjectSearch] = useState("");

  const form = useForm<AdminClientData & { pid?: string }>({
    resolver: zodResolver(adminClientSchema),
    defaultValues: {
      name: client.name || "",
      email: client.email || "",
      affiliation: client.affiliation || "",
      designation: client.designation || "",
      sex: client.sex || "M",
      phoneNumber: client.phoneNumber || "",
      pid: client.pid || "",
    },
  });

  // Fetch project options
  useEffect(() => {
    getProjects().then((projects) => {
      setProjectOptions(projects);
    });
  }, []);

  // Filter project options by search
  const filteredProjectOptions = projectOptions.filter(
    (proj) =>
      proj.pid?.toLowerCase().includes(projectSearch.toLowerCase()) ||
      proj.title?.toLowerCase().includes(projectSearch.toLowerCase()) ||
      proj.lead?.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const onSubmit = async (data: AdminClientData) => {
    setIsLoading(true);
    try {
      // Get old client data for logging
      const clientRef = doc(db, "clients", client.cid!);
      const clientDoc = await getDoc(clientRef);
      const oldData = clientDoc.data();
      
      // Check if pid changed
      const pidChanged = client.pid !== data.pid;
      
      // Include pid in the update data
      const updateData = {
        name: data.name,
        email: data.email,
        affiliation: data.affiliation,
        designation: data.designation,
        sex: data.sex,
        phoneNumber: data.phoneNumber,
        pid: data.pid,
      };
      
      // Update client and handle project name synchronization
      await updateClientAndProjectName(
        client.cid!, 
        updateData, 
        client.name, 
        pidChanged ? client.pid : undefined
      );
      
      // Log the activity
      const changedFields = Object.keys(updateData).filter(
        (key) => (oldData?.[key] ?? null) !== (updateData[key as keyof typeof updateData] ?? null)
      );
      await logActivity({
        userId: adminInfo?.email || "system",
        userEmail: adminInfo?.email || "system@pgc.admin",
        userName: adminInfo?.name || "System",
        action: "UPDATE",
        entityType: "client",
        entityId: client.cid!,
        entityName: data.name || client.cid!,
        description: `Updated client: ${data.name || client.cid!}`,
        changesBefore: oldData,
        changesAfter: { ...oldData, ...updateData },
        changedFields,
      });
      
      toast.success("Client updated successfully!");
      setIsOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error updating client:", error);
      toast.error("Failed to update client. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!client.cid) return;
    try {
      // Get client data before deletion for logging
      const clientRef = doc(db, "clients", client.cid);
      const clientDoc = await getDoc(clientRef);
      const clientData = clientDoc.data();
      
      await deleteDoc(clientRef);
      
      // Log the activity
      await logActivity({
        userId: adminInfo?.email || "system",
        userEmail: adminInfo?.email || "system@pgc.admin",
        userName: adminInfo?.name || "System",
        action: "DELETE",
        entityType: "client",
        entityId: client.cid,
        entityName: client.name || client.cid,
        description: `Deleted client: ${client.name || client.cid}`,
        changesBefore: clientData,
      });
      
      toast.success("Client deleted successfully!");
      setShowDeleteConfirm(false);
      setIsOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error deleting client:", error);
      toast.error("Failed to delete client. Please try again.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <UserCog className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Edit Client</DialogTitle>
              <DialogDescription className="text-sm mt-1">
                Update client information and manage associations
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs px-3 py-1">
              ID: {client.cid}
            </Badge>
          </div>
        </DialogHeader>

        <Separator className="my-1" />
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            {/* Personal Information Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 rounded-md">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-700">Personal Information</h3>
              </div>
              <Separator />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter full name" className="h-9" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Enter email address" className="h-9" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="sex"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Sex</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select sex" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="M">Male</SelectItem>
                        <SelectItem value="F">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Mobile Number</FormLabel>
                    <FormControl>
                      <Input placeholder="09091234567" className="h-9" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Professional Information Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-50 rounded-md">
                  <Briefcase className="h-4 w-4 text-purple-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-700">Professional Information</h3>
              </div>
              <Separator />
            </div>

            <FormField
              control={form.control}
              name="pid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Project ID</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select project">
                          {field.value ? (
                            <div className="flex flex-col items-start" title={projectOptions.find(p => p.pid === field.value)?.title}>
                              <span className="font-medium text-sm">{field.value}</span>
                              {projectOptions.find(p => p.pid === field.value)?.title && (
                                <span className="text-xs text-gray-500 truncate max-w-[200px]">
                                  {projectOptions.find(p => p.pid === field.value)?.title}
                                </span>
                              )}
                            </div>
                          ) : (
                            "Select project"
                          )}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[300px] w-[400px]">
                      <div className="sticky top-0 bg-white z-10 p-2 border-b">
                        <Input
                          placeholder="Search by ID, Title, or Lead..."
                          value={projectSearch}
                          onChange={e => setProjectSearch(e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="max-h-[240px] overflow-y-auto">
                        {filteredProjectOptions.length > 0 ? (
                          filteredProjectOptions.map((proj) => (
                            <SelectItem key={proj.pid} value={proj.pid || ""} className="text-sm">
                              <div className="flex flex-col py-1">
                                <span className="font-medium text-gray-900">{proj.pid}</span>
                                <span className="text-xs text-gray-600">{proj.title}</span>
                                {proj.lead && (
                                  <span className="text-xs text-gray-500 truncate max-w-[350px]" title={proj.lead}>
                                    Lead: {proj.lead}
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="affiliation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Affiliation (Department & Institution)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Division of Biological Sciences - UPV CAS" className="h-9" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="designation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Designation</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter job title or position" className="h-9" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
           
            <Separator className="my-4" />
            
            <div className="flex justify-between items-center pt-2">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isLoading}
                className="min-w-[100px] hover:bg-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <div className="flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsOpen(false)}
                  disabled={isLoading}
                  className="min-w-[100px]"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading} 
                  className="min-w-[120px] bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-md"
                >
                  {isLoading ? (
                    <>
                      <span className="mr-2">Saving...</span>
                      <span className="animate-spin">⏳</span>
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
              <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent className="max-w-xs w-full">
                  <DialogHeader>
                    <DialogTitle>Delete Client</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete this client? This action cannot be undone.
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