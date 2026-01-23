"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { adminInquirySchema, AdminInquiryData } from "@/schemas/adminInquirySchema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  FormDescription,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { createAdminInquiryAction } from "@/app/actions/inquiryActions";
import useAuth from "@/hooks/useAuth";
import { Plus, UserPlus, Mail, Building2, Briefcase, CheckCircle2 } from "lucide-react";

interface AddInquiryModalProps {
  onSuccess?: () => void;
}

export function AddInquiryModal({ onSuccess }: AddInquiryModalProps) {
  const { adminInfo } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<AdminInquiryData>({
    resolver: zodResolver(adminInquirySchema),
    defaultValues: {
      name: "",
      email: "",
      affiliation: "",
      designation: "",
      status: "Pending",
    },
  });

  const onSubmit = async (data: AdminInquiryData) => {
    setIsLoading(true);
    try {
      await createAdminInquiryAction(data, {
        name: adminInfo?.name || "System",
        email: adminInfo?.email || "system@pgc.admin"
      });
      
      toast.success("Inquiry added successfully!");
      form.reset();
      setIsOpen(false);
      onSuccess?.();
      
    } catch (error) {
      console.error("Error creating inquiry:", error);
      toast.error("Failed to add inquiry. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transition-all duration-200">
          <Plus className="mr-2 h-4 w-4" />
          Add New Inquiry
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <UserPlus className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Create New Inquiry</DialogTitle>
              <DialogDescription className="text-sm mt-1">
                Add a new inquiry record to track potential clients
              </DialogDescription>
            </div>
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
                          placeholder="Juan dela Cruz" 
                          className="h-10 focus-visible:ring-blue-500"
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
                          placeholder="juan.cruz@example.com" 
                          className="h-10 focus-visible:ring-blue-500"
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
                          placeholder="University of the Philippines Visayas" 
                          className="h-10 focus-visible:ring-blue-500"
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
                          placeholder="Researcher, Faculty, etc." 
                          className="h-10 focus-visible:ring-blue-500"
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
                          <SelectTrigger className="h-10 focus-visible:ring-blue-500">
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
            <div className="flex justify-end gap-3 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  form.reset();
                  setIsOpen(false);
                }}
                disabled={isLoading}
                className="min-w-[100px]"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="min-w-[120px] bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md"
              >
                {isLoading ? (
                  <>
                    <span className="mr-2">Adding...</span>
                    <span className="animate-spin">⏳</span>
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Inquiry
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}