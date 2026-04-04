"use client";

import { useState, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, Mail, Building2, CheckCircle2, FileEdit, MessageSquare, Send } from "lucide-react";
import { Inquiry } from "@/types/Inquiry";
import { updateInquiryAction, deleteInquiryAction } from "@/app/actions/inquiryActions";
import useAuth from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import { getCatalogSettings } from "@/services/catalogSettingsService";

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

  // Load catalog settings for inquiry statuses
  const { data: catalogSettings } = useQuery({
    queryKey: ["catalogSettings"],
    queryFn: getCatalogSettings,
  });

  // Fallback statuses if catalog is not loaded
  const fallbackStatuses = [
    { value: "Pending", color: "#facc15" },
    { value: "Approved Client", color: "#22c55e" },
    { value: "Ongoing Quotation", color: "#f97316" },
    { value: "Quotation Only", color: "#3b82f6" },
    { value: "In Progress", color: "#0ea5e9" },
    { value: "Service Not Offered", color: "#64748b" },
    { value: "Cancelled", color: "#64748b" },
  ];

  // Get status options from catalog or fallback
  const statusOptions = useMemo(() => {
    const statuses = catalogSettings?.inquiryStatuses || fallbackStatuses;
    return statuses.map(s => ({
      value: s.value,
      color: s.color || "#64748b"
    }));
  }, [catalogSettings]);

  // Helper to convert hex to rgba
  const hexToRgba = (hex: string, alpha: number) => {
    const cleaned = hex.replace("#", "");
    if (cleaned.length !== 6) return "";
    const r = parseInt(cleaned.substring(0, 2), 16);
    const g = parseInt(cleaned.substring(2, 4), 16);
    const b = parseInt(cleaned.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const form = useForm<AdminInquiryData>({
    resolver: zodResolver(adminInquirySchema),
    defaultValues: {
      name: inquiry.name,
      email: inquiry.email || "",
      affiliation: inquiry.affiliation,
      designation: inquiry.designation,
      status: inquiry.status,
      remarks: "",
      sendStatusEmail: true,
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
          <Button
            variant="ghost"
            size="sm"
            data-stop-row-click="true"
            onClick={(event) => event.stopPropagation()}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent
          className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto"
          data-stop-row-click="true"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
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
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6"
              data-stop-row-click="true"
              onClick={(event) => event.stopPropagation()}
            >
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
                            {statusOptions.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                <div className="flex items-center gap-2">
                                  <Badge 
                                    variant="outline" 
                                    style={{
                                      backgroundColor: hexToRgba(status.color, 0.1),
                                      color: status.color,
                                      borderColor: hexToRgba(status.color, 0.3),
                                    }}
                                  >
                                    {status.value}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-xs text-gray-500">
                          Current processing status of this inquiry
                        </FormDescription>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  {form.watch("status") === "Service Not Offered" && (
                    <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <FormField
                        control={form.control}
                        name="remarks"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                              <MessageSquare className="h-3 w-3" />
                              Remarks
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Enter reason or additional notes..."
                                className="min-h-[80px] text-sm resize-none focus-visible:ring-red-500 border-red-100 bg-red-50/10"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="sendStatusEmail"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border border-blue-100 bg-blue-50/30 p-3">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-medium text-blue-900 flex items-center gap-2 cursor-pointer">
                                <Send className="h-3 w-3" />
                                Send update email to client
                              </FormLabel>
                              <FormDescription className="text-[11px] text-blue-700/70 italic">
                                Automatically sends the "Service Not Offered" email template
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
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