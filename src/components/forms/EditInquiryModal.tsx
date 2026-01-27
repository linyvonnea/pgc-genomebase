"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { adminInquirySchema, AdminInquiryData } from "@/schemas/adminInquirySchema";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Pencil, Trash2, Mail, Building2, CheckCircle2, FileEdit } from "lucide-react";
import { Inquiry } from "@/types/Inquiry";
import { updateInquiryAction, deleteInquiryAction } from "@/app/actions/inquiryActions";
import useAuth from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";

interface EditInquiryModalProps {
  inquiry: Inquiry;
  onSuccess?: () => void;
}

export function EditInquiryModal({ inquiry, onSuccess }: EditInquiryModalProps) {
  const { adminInfo } = useAuth();
  const { canDelete } = usePermissions(adminInfo?.role);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<AdminInquiryData>({
    resolver: zodResolver(adminInquirySchema),
    defaultValues: {
      name: inquiry.name,
      email: inquiry.email || "",
      affiliation: inquiry.affiliation,
      designation: inquiry.designation,
      status: inquiry.status,
    },
  });

  const onSubmit = async (data: AdminInquiryData) => {
    setIsLoading(true);
    try {
      await updateInquiryAction(inquiry.id, data);
      toast.success("Inquiry updated successfully!");
      setIsOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error updating inquiry:", error);
      toast.error("Failed to update inquiry. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteInquiryAction(
        inquiry.id,
        adminInfo ? { name: adminInfo.name, email: adminInfo.email } : undefined
      );
      toast.success("Inquiry deleted successfully!");
      setShowDeleteAlert(false);
      setIsOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error deleting inquiry:", error);
      toast.error("Failed to delete inquiry. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm">
            <Pencil className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-3 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <FileEdit className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <DialogTitle className="text-2xl">Edit Inquiry</DialogTitle>
                <DialogDescription className="text-sm mt-1">
                  Update inquiry information and track status changes
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs px-3 py-1">
                ID: {inquiry.id}
              </Badge>
            </div>
          </DialogHeader>

          <Separator className="my-1" />
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Contact Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-700">Contact Information</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-4 pl-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium flex items-center gap-1">
                          Full Name <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="John Doe" 
                            className="h-10 focus-visible:ring-purple-500"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium flex items-center gap-1">
                          Email Address <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="john.doe@example.com" 
                            className="h-10 focus-visible:ring-purple-500"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription className="text-xs text-gray-500">
                          Primary contact email for correspondence
                        </FormDescription>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Professional Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-700">Professional Details</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-4 pl-6">
                  <FormField
                    control={form.control}
                    name="affiliation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium flex items-center gap-1">
                          Affiliation <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="University of the Philippines Manila" 
                            className="h-10 focus-visible:ring-purple-500"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription className="text-xs text-gray-500">
                          Institution or organization name
                        </FormDescription>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="designation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium flex items-center gap-1">
                          Designation <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Research Scientist, Professor, etc." 
                            className="h-10 focus-visible:ring-purple-500"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription className="text-xs text-gray-500">
                          Job title or position
                        </FormDescription>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Status Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-700">Inquiry Status</h3>
                </div>
                
                <div className="pl-6">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-10 focus-visible:ring-purple-500">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Pending">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                  Pending
                                </Badge>
                              </div>
                            </SelectItem>
                            <SelectItem value="Approved Client">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  Approved Client
                                </Badge>
                              </div>
                            </SelectItem>
                            <SelectItem value="Quotation Only">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  Quotation Only
                                </Badge>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-xs text-gray-500">
                          Current processing status of this inquiry
                        </FormDescription>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <Separator className="my-4" />
              
              {/* Action Buttons */}
              <div className="flex justify-between pt-2">
                {canDelete("inquiries") && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setShowDeleteAlert(true)}
                    disabled={isLoading || isDeleting}
                    className="min-w-[100px] hover:bg-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
                
                <div className={`flex gap-3 ${!canDelete("inquiries") ? "w-full justify-end" : ""}`}>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsOpen(false)}
                    disabled={isLoading || isDeleting}
                    className="min-w-[100px]"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isLoading || isDeleting}
                    className="min-w-[120px] bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md"
                  >
                    {isLoading ? (
                      <>
                        <span className="mr-2">Saving...</span>
                        <span className="animate-spin">⏳</span>
                      </>
                    ) : (
                      <>
                        <Pencil className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the inquiry
              for <strong>{inquiry.name}</strong> from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}