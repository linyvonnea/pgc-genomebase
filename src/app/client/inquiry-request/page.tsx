/**
 * Client Inquiry Request Form Page
 * 
 * This is the main form page where clients can submit requests for different services offered by the PGC. The form dynamically changes based on the selected service type and includes comprehensive validation.
 * 
 * Used in:
 * - Client-facing inquiry submission (/client/inquiry-request)
 * 
 * Key Features:
 * - Dynamic form fields based on service type selection
 * - Real-time form validation using Zod schemas
 * - Confirmation modal before submission
 * - Toast notifications for user feedback
 * - Authentication integration for user email
 * - Responsive design with modern UI
 */

"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { inquiryFormSchema, type InquiryFormData, type WorkflowOption } from "@/schemas/inquirySchema"
import { createInquiryAction } from "@/app/actions/inquiryActions"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "sonner" 
import useAuth from "@/hooks/useAuth"
import ConfirmationModalLayout from "@/components/modal/ConfirmationModalLayout"
import { useRouter } from "next/navigation"

/**
 * Main Quotation Request Form Component
 * 
 * This component handles the complete inquiry submission flow including
 * form validation, confirmation, and submission to the backend.
 */
export default function QuotationRequestForm() {
  // State for managing the currently selected service type
  const [selectedService, setSelectedService] = useState<string>("laboratory")
  
  // Loading state for form submission
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Modal state for confirmation dialog
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  
  // Temporary storage for form data before confirmation
  const [pendingData, setPendingData] = useState<InquiryFormData | null>(null)
  
  // State for training date picker (separate from form state for UI purposes)
  const [trainingDate, setTrainingDate] = useState<Date>()
  
  // Get authenticated user information
  const { user } = useAuth()
  const router = useRouter()

  // Initialize form with validation schema and default values
  const form = useForm<InquiryFormData>({
    resolver: zodResolver(inquiryFormSchema), 
    defaultValues: {
      name: "",
      affiliation: "",
      designation: "",
      service: "laboratory", 
      workflows: [],
      additionalInfo: "",
      projectBackground: "",
      projectBudget: "",
      specificTrainingNeed: "",
      targetTrainingDate: "",
      numberOfParticipants: undefined
    }
  })

  // Destructure form methods for easier access
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = form
  const formData = watch() // Watch all form values for reactive updates

  /**
   * Handles service type selection and resets service-specific fields
   * When a user changes the service type, clear all the fields
   * that are specific to other service types to prevent data contamination.
   */
  const handleServiceChange = (value: string) => {
    setSelectedService(value)
    setValue("service", value as "laboratory" | "research" | "training")
    
    // Reset service-specific fields when switching to prevent cross-contamination
    setValue("workflows", [])
    setValue("additionalInfo", "")
    setValue("projectBackground", "")
    setValue("projectBudget", "")
    setValue("specificTrainingNeed", "")
    setValue("targetTrainingDate", "")
    setValue("numberOfParticipants", undefined)
    setTrainingDate(undefined)
  }

  /**
   * Handles workflow checkbox changes for laboratory service
   * 
   * Updates the workflows array by adding or removing the selected workflow
   * based on whether the checkbox is checked or unchecked.
   */
  const handleWorkflowChange = (workflow: string, checked: boolean) => {
    const currentWorkflows = formData.workflows || []
    const newWorkflows = checked 
      ? [...currentWorkflows, workflow as WorkflowOption] 
      : currentWorkflows.filter(w => w !== workflow)
    setValue("workflows", newWorkflows)
  }

  /**
   * Handles date selection for training service
   * 
   * Updates both the local state (for UI display) and the form value
   * (for validation and submission). Formats the date as ISO string.
   */
  const handleDateSelect = (date: Date | undefined) => {
    setTrainingDate(date)
    if (date) {
      // Format date as YYYY-MM-DD for form submission
      setValue("targetTrainingDate", format(date, "yyyy-MM-dd"))
    } else {
      setValue("targetTrainingDate", "")
    }
  }

  /**
   * Handles form submission - shows confirmation modal instead of direct submission
   * 
   * This provides a two-step submission process where users can review their
   * data before final submission.
   */
  const handleFormSubmit = (data: InquiryFormData) => {
    setPendingData(data)        // Store data temporarily
    setShowConfirmModal(true)   // Show confirmation modal
  }

  /**
   * Handles the actual form submission after user confirmation
   * 
   * This function is called when the user confirms their submission in the modal.
   */
  const handleConfirmSave = async () => {
    if (!pendingData) return
    
    setIsSubmitting(true)
    setShowConfirmModal(false)
    
    // Show loading toast notification
    toast.loading("Submitting your inquiry request...", {
      description: "Please wait while we process your request. You will be redirected to the confirmation page shortly.",
      duration: Infinity, 
    })
    
    try {
      // Merge form data with user email from authentication
      const submissionData = {
        ...pendingData,
        email: user?.email || "" // Get email from authenticated user
      }
      
      // Submit to server action
      const result = await createInquiryAction(submissionData)
      
      if (result.success) {
        // Dismiss loading toast and show success
        toast.dismiss()
        toast.success("Inquiry submitted successfully!", {
          description: "Thank you for your submission. Redirecting to another page...",
          duration: 4000,
        })
        
        // Reset form and redirect after brief delay to show success message
        setTimeout(() => {
          reset()
          setSelectedService("laboratory") 
          setTrainingDate(undefined) 
          router.push("/client/inquiry-request/submitted")
        }, 2000)
        return
      }
    } catch (error) {
      console.error("Error submitting form:", error)
      toast.dismiss()
      toast.error("Failed to submit inquiry", {
        description: "There was an error submitting your request. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
      setPendingData(null)
    }
  }

  /**
   * Handles cancellation of the confirmation modal
   * Closes the modal and clears pending data without submitting.
   */
  const handleCancelModal = () => {
    setShowConfirmModal(false)
    setPendingData(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50/50 to-blue-50/30 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 bg-gradient-to-r from-[#F69122] to-[#912ABD] rounded-full"></div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#166FB5] to-[#4038AF] bg-clip-text text-transparent">
                Quotation Request Form
              </h1>
            </div>
            {/* Information banner explaining available services */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
              <p className="text-slate-700 leading-relaxed">
                Thank you for reaching out to PGC researchers for your research needs. We offer a range of 
                services from Equipment Use, DNA Extraction, Polymerase Chain Reaction (PCR), Sample 
                Purification, Next Generation Sequencing (NGS), Bioinformatics Analysis, and Training Services. 
                To assist you better, kindly provide us with the following information:
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
            {/* Personal Information Section */}
            <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 rounded-xl p-6 border border-slate-100">
              <h2 className="text-xl font-semibold text-slate-800 mb-6 flex items-center gap-2">
                <div className="w-2 h-2 bg-gradient-to-r from-[#166FB5] to-[#4038AF] rounded-full"></div>
                Personal Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name Field */}
                <div className="md:col-span-2">
                  <Label htmlFor="name" className="text-sm font-semibold text-slate-700 mb-2 block">
                    Full Name <span className="text-[#B9273A]">*</span>
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    {...register("name")}
                    className="bg-white/70 border-slate-200 focus:border-[#166FB5] focus:ring-[#166FB5]/20 h-12"
                  />
                  {errors.name && (
                    <p className="text-[#B9273A] text-sm mt-1 flex items-center gap-1">
                      <span className="w-1 h-1 bg-[#B9273A] rounded-full"></span>
                      {errors.name.message}
                    </p>
                  )}
                </div>

                {/* Affiliation Field */}
                <div className="md:col-span-2">
                  <Label htmlFor="affiliation" className="text-sm font-semibold text-slate-700 mb-2 block">
                    Affiliation (Department & Institution Name) <span className="text-[#B9273A]">*</span>
                  </Label>
                  <Input
                    id="affiliation"
                    type="text"
                    placeholder="e.g. Division of Biological Sciences - UPV CAS"
                    {...register("affiliation")}
                    className="bg-white/70 border-slate-200 focus:border-[#166FB5] focus:ring-[#166FB5]/20 h-12"
                  />
                  {errors.affiliation && (
                    <p className="text-[#B9273A] text-sm mt-1 flex items-center gap-1">
                      <span className="w-1 h-1 bg-[#B9273A] rounded-full"></span>
                      {errors.affiliation.message}
                    </p>
                  )}
                </div>

                {/* Designation Field */}
                <div className="md:col-span-2">
                  <Label htmlFor="designation" className="text-sm font-semibold text-slate-700 mb-2 block">
                    Designation <span className="text-[#B9273A]">*</span>
                  </Label>
                  <Input
                    id="designation"
                    type="text"
                    placeholder="e.g. Research Assistant, Professor"
                    {...register("designation")}
                    className="bg-white/70 border-slate-200 focus:border-[#166FB5] focus:ring-[#166FB5]/20 h-12"
                  />
                  {errors.designation && (
                    <p className="text-[#B9273A] text-sm mt-1 flex items-center gap-1">
                      <span className="w-1 h-1 bg-[#B9273A] rounded-full"></span>
                      {errors.designation.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Service Selection Section */}
            <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 rounded-xl p-6 border border-slate-100">
              <h2 className="text-xl font-semibold text-slate-800 mb-6 flex items-center gap-2">
                <div className="w-2 h-2 bg-gradient-to-r from-[#F69122] to-[#B9273A] rounded-full"></div>
                Service Selection
              </h2>
              
              <div>
                <Label htmlFor="service" className="text-sm font-semibold text-slate-700 mb-2 block">
                  Select Service Type:
                </Label>
                {/* Service type dropdown that triggers form field changes */}
                <Select onValueChange={handleServiceChange} defaultValue="laboratory">
                  <SelectTrigger className="bg-white/70 border-slate-200 focus:border-[#166FB5] focus:ring-[#166FB5]/20 h-12">
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="laboratory">Laboratory Service</SelectItem>
                    <SelectItem value="research">Research and Collaboration</SelectItem>
                    <SelectItem value="training">Training Service</SelectItem>
                  </SelectContent>
                </Select>
                {errors.service && (
                  <p className="text-[#B9273A] text-sm mt-1 flex items-center gap-1">
                    <span className="w-1 h-1 bg-[#B9273A] rounded-full"></span>
                    {errors.service.message}
                  </p>
                )}
              </div>
            </div>

            {/* Dynamic Fields Section - Changes based on selected service */}
            <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 rounded-xl p-6 border border-slate-100">
              <h2 className="text-xl font-semibold text-slate-800 mb-6 flex items-center gap-2">
                <div className="w-2 h-2 bg-gradient-to-r from-[#912ABD] to-[#4038AF] rounded-full"></div>
                Service Details
              </h2>
              
              {/* Laboratory Service Fields */}
              {selectedService === "laboratory" && (
                <div className="space-y-6">
                  {/* Workflow Selection - Multiple checkboxes */}
                  <div>
                    <Label className="text-sm font-semibold text-slate-700 mb-3 block">
                      Kindly choose which workflow you will be availing <span className="text-[#B9273A]">*</span>
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {([
                        { id: "dna-extraction", label: "DNA extraction" },
                        { id: "sequencing", label: "Sequencing" },
                        { id: "pcr-amplification", label: "PCR amplification" },
                        { id: "bioinformatics", label: "Bioinformatics" },
                        { id: "quantification", label: "Quantification" },
                        { id: "complete-workflow", label: "Complete Workflow" }
                      ] as Array<{ id: WorkflowOption; label: string }>).map((workflow) => (
                        <div key={workflow.id} className="flex items-center space-x-3 p-3 bg-white/50 rounded-lg border border-slate-100 hover:bg-white/70 transition-colors">
                          <input
                            type="checkbox"
                            id={workflow.id}
                            checked={formData.workflows?.includes(workflow.id) || false}
                            onChange={(e) => handleWorkflowChange(workflow.id, e.target.checked)}
                            className="rounded border-slate-300 text-[#166FB5] focus:ring-[#166FB5]/20"
                          />
                          <Label htmlFor={workflow.id} className="text-sm text-slate-700 font-medium cursor-pointer">
                            {workflow.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {errors.workflows && (
                      <p className="text-[#B9273A] text-sm mt-1 flex items-center gap-1">
                        <span className="w-1 h-1 bg-[#B9273A] rounded-full"></span>
                        {errors.workflows.message}
                      </p>
                    )}
                  </div>

                  {/* Additional Information - Optional text area */}
                  <div>
                    <Label htmlFor="additionalInfo" className="text-sm font-semibold text-slate-700 mb-2 block">
                      Do you have questions or any other additional information?
                    </Label>
                    <Textarea
                      id="additionalInfo"
                      placeholder="Enter a description..."
                      {...register("additionalInfo")}
                      className="bg-white/70 border-slate-200 focus:border-[#166FB5] focus:ring-[#166FB5]/20 min-h-[100px] resize-none"
                      rows={4}
                    />
                    {errors.additionalInfo && (
                      <p className="text-[#B9273A] text-sm mt-1 flex items-center gap-1">
                        <span className="w-1 h-1 bg-[#B9273A] rounded-full"></span>
                        {errors.additionalInfo.message}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Research Service Fields */}
              {selectedService === "research" && (
                <div className="space-y-6">
                  {/* Project Background - Required for research */}
                  <div>
                    <Label htmlFor="projectBackground" className="text-sm font-semibold text-slate-700 mb-2 block">
                      Indicate a brief background of the project and required molecular workflow <span className="text-[#B9273A]">*</span>
                    </Label>
                    <Textarea
                      id="projectBackground"
                      placeholder="Enter a description..."
                      {...register("projectBackground")}
                      className="bg-white/70 border-slate-200 focus:border-[#166FB5] focus:ring-[#166FB5]/20 min-h-[100px] resize-none"
                      rows={4}
                    />
                    {errors.projectBackground && (
                      <p className="text-[#B9273A] text-sm mt-1 flex items-center gap-1">
                        <span className="w-1 h-1 bg-[#B9273A] rounded-full"></span>
                        {errors.projectBackground.message}
                      </p>
                    )}
                  </div>

                  {/* Project Budget - Required for research */}
                  <div>
                    <Label htmlFor="projectBudget" className="text-sm font-semibold text-slate-700 mb-2 block">
                      Indicate project budget for molecular workflow <span className="text-[#B9273A]">*</span>
                    </Label>
                    <Input
                      id="projectBudget"
                      type="text"
                      placeholder="₱"
                      {...register("projectBudget")}
                      className="bg-white/70 border-slate-200 focus:border-[#166FB5] focus:ring-[#166FB5]/20 h-12"
                    />
                    {errors.projectBudget && (
                      <p className="text-[#B9273A] text-sm mt-1 flex items-center gap-1">
                        <span className="w-1 h-1 bg-[#B9273A] rounded-full"></span>
                        {errors.projectBudget.message}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Training Service Fields */}
              {selectedService === "training" && (
                <div className="space-y-6">
                  {/* Training Information Section - Informational content */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-800 mb-3">PGC Visayas Training Services</h3>
                        <p className="text-slate-700 mb-3">PGC Visayas offers a range of training services, including:</p>
                        <ul className="list-disc list-inside space-y-1 text-slate-700 ml-4">
                          <li>Basic Molecular Techniques (DNA Extraction, PCR, and Quantification)</li>
                          <li>Library Preparation for Next Generation Sequencing (Amplicon Sequencing, 16s Metabarcoding, Whole Genome Sequencing)</li>
                          <li>Sequencing (Illumina iSeq 100 and NextSeq 1000)</li>
                          <li>Bioinformatics Analysis (Customized depending on the needed application)</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-slate-800 mb-2">Training Structure:</h4>
                        <div className="space-y-2 text-slate-700">
                          <div>
                            <span className="font-medium">Lecture and Hands-On Training (4-5 day Training)</span>
                            <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                              <li>Lecture and Hands-On Laboratory Training (2-3 days)</li>
                              <li>Lecture and Hand-On Bioinformatics Training (1-2 days)</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-slate-700 font-medium">
                        If you are interested, kindly provide us with the following details:
                      </p>
                    </div>
                  </div>

                  {/* Specific Training Need - Required field */}
                  <div>
                    <Label htmlFor="specificTrainingNeed" className="text-sm font-semibold text-slate-700 mb-2 block">
                      Specific Training Needs <span className="text-[#B9273A]">*</span>
                    </Label>
                    <Input
                      id="specificTrainingNeed"
                      type="text"
                      placeholder="Describe the specific training you need..."
                      {...register("specificTrainingNeed")}
                      className="bg-white/70 border-slate-200 focus:border-[#166FB5] focus:ring-[#166FB5]/20 h-12"
                    />
                    {errors.specificTrainingNeed && (
                      <p className="text-[#B9273A] text-sm mt-1 flex items-center gap-1">
                        <span className="w-1 h-1 bg-[#B9273A] rounded-full"></span>
                        {errors.specificTrainingNeed.message}
                      </p>
                    )}
                  </div>

                  {/* Target Date for Training with Calendar Picker */}
                  <div>
                    <Label className="text-sm font-semibold text-slate-700 mb-2 block">
                      Target Date for the Training <span className="text-[#B9273A]">*</span>
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full h-12 justify-start text-left font-normal bg-white/70 border-slate-200 focus:border-[#166FB5] focus:ring-[#166FB5]/20",
                            !trainingDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {trainingDate ? format(trainingDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={trainingDate}
                          onSelect={handleDateSelect}
                          disabled={(date) =>
                            date < new Date() || date < new Date("1900-01-01") // Disable past dates
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.targetTrainingDate && (
                      <p className="text-[#B9273A] text-sm mt-1 flex items-center gap-1">
                        <span className="w-1 h-1 bg-[#B9273A] rounded-full"></span>
                        {errors.targetTrainingDate.message}
                      </p>
                    )}
                  </div>

                  {/* Number of Participants - Required field with minimum constraint */}
                  <div>
                    <Label htmlFor="numberOfParticipants" className="text-sm font-semibold text-slate-700 mb-2 block">
                      Number of Participants (Minimum of 6 pax for in-person) <span className="text-[#B9273A]">*</span>
                    </Label>
                    <Input
                      id="numberOfParticipants"
                      type="number"
                      min="1"
                      placeholder="Enter number of participants"
                      {...register("numberOfParticipants", { valueAsNumber: true })} 
                      className="bg-white/70 border-slate-200 focus:border-[#166FB5] focus:ring-[#166FB5]/20 h-12"
                    />
                    {errors.numberOfParticipants && (
                      <p className="text-[#B9273A] text-sm mt-1 flex items-center gap-1">
                        <span className="w-1 h-1 bg-[#B9273A] rounded-full"></span>
                        {errors.numberOfParticipants.message}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-8 border-t border-slate-100">
              <Button 
                type="submit" 
                className="h-12 px-8 bg-gradient-to-r from-[#166FB5] to-[#4038AF] hover:from-[#166FB5]/90 hover:to-[#4038AF]/90 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Confirmation Modal - Shows form data review before final submission */}
      <ConfirmationModalLayout
        open={showConfirmModal}
        onConfirm={handleConfirmSave}
        onCancel={handleCancelModal}
        loading={isSubmitting}
        title="Please double check before saving"
        description="Review your entries below before confirming. This action cannot be undone."
        confirmLabel="Confirm & Submit"
        cancelLabel="Go Back"
      >
        {/* Display all form data for user review */}
        {pendingData && (
          <div className="space-y-2 text-slate-800 text-sm">
            <div><span className="font-semibold">Full Name:</span> {pendingData.name}</div>
            <div><span className="font-semibold">Affiliation:</span> {pendingData.affiliation}</div>
            <div><span className="font-semibold">Designation:</span> {pendingData.designation}</div>
            <div><span className="font-semibold">Service Type:</span> {pendingData.service}</div>
            
            {/* Show service-specific fields based on service type */}
            {pendingData.service === "laboratory" && (
              <div>
                <span className="font-semibold">Workflows:</span> {pendingData.workflows?.join(", ") || "-"}
              </div>
            )}
            {pendingData.service === "laboratory" && (
              <div>
                <span className="font-semibold">Additional Info:</span> {pendingData.additionalInfo || "-"}
              </div>
            )}
            {pendingData.service === "research" && (
              <>
                <div><span className="font-semibold">Project Background:</span> {pendingData.projectBackground}</div>
                <div><span className="font-semibold">Project Budget:</span> {pendingData.projectBudget}</div>
              </>
            )}
            {pendingData.service === "training" && (
              <>
                <div><span className="font-semibold">Specific Training Need:</span> {pendingData.specificTrainingNeed}</div>
                <div><span className="font-semibold">Target Training Date:</span> {pendingData.targetTrainingDate}</div>
                <div><span className="font-semibold">Number of Participants:</span> {pendingData.numberOfParticipants}</div>
              </>
            )}
          </div>
        )}
      </ConfirmationModalLayout>
    </div>
  )
}