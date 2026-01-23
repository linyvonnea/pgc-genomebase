"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { adminClientSchema, AdminClientData } from "@/schemas/adminClientSchema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from 'lucide-react';
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
import { Pencil } from "lucide-react";
import { Client } from "@/types/Client";
import { updateClientAndProjectName } from "@/services/updateClientAndProjectName";
import { toast } from "sonner";
import { deleteDoc, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { logActivity } from "@/services/activityLogService";

interface EditClientModalProps {
  client: Client;
  onSuccess?: () => void;
}

export function EditClientModal({ client, onSuccess }: EditClientModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
        userId: "system",
        userEmail: "system@pgc.admin",
        userName: "System",
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
        userId: "system",
        userEmail: "system@pgc.admin",
        userName: "System",
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
        <DialogHeader>
          <DialogTitle>Edit Client</DialogTitle>
          <DialogDescription>
            Update the client information. Click save when you're done.
          </DialogDescription>
          <div className="flex items-center gap-2 pt-3 pb-1">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-md">
              <span className="text-xs font-medium text-gray-600">Client ID:</span>
              <span className="text-sm font-semibold text-green-700">{client.cid}</span>
            </div>
          </div>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            {/* Personal Information Section */}
            <div className="border-b pb-2">
              <h3 className="text-sm font-semibold text-gray-700">Personal Information</h3>
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
            <div className="border-b pb-2 pt-2">
              <h3 className="text-sm font-semibold text-gray-700">Professional Information</h3>
            </div>

            <FormField
              control={form.control}
              name="pid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Project ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter project ID" className="h-9" {...field} />
                  </FormControl>
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
           
            <div className="flex justify-between items-center pt-3 mt-3 border-t">
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
                  className="px-4"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="px-6">
                  {isLoading ? "Saving..." : "Save Changes"}
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