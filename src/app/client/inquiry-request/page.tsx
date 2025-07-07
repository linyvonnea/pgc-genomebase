"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { inquiryFormSchema, type InquiryFormData, type WorkflowOption } from "@/schemas/inquirySchema"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function QuotationRequestForm() {
  const [selectedService, setSelectedService] = useState<string>("laboratory")
  
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
      projectBudget: ""
    }
  })

  const { register, handleSubmit, setValue, watch, formState: { errors } } = form
  const formData = watch()

  const handleServiceChange = (value: string) => {
    setSelectedService(value)
    setValue("service", value as "laboratory" | "research")
    // Reset service-specific fields when switching
    setValue("workflows", [])
    setValue("additionalInfo", "")
    setValue("projectBackground", "")
    setValue("projectBudget", "")
  }

  const handleWorkflowChange = (workflow: string, checked: boolean) => {
    const currentWorkflows = formData.workflows || []
    const newWorkflows = checked 
      ? [...currentWorkflows, workflow as WorkflowOption]
      : currentWorkflows.filter(w => w !== workflow)
    setValue("workflows", newWorkflows)
  }

  const onSubmit = (data: InquiryFormData) => {
    console.log("Form submitted:", data)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Quotation Request Form</h1>
        
        <div className="mb-4">
          <p className="text-gray-600 leading-relaxed text-justify mb-6">
            Thank you for reaching out to PGC researchers for your research needs. We offer a range of 
            services from Equipment Use, DNA Extraction, Polymerase Chain Reaction (PCR), Sample 
            Purification, Next Generation Sequencing (NGS), and Bioinformatics Analysis. To assist 
            you better kindly provide us with the following information:
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Required Fields Section */}
            <div className="space-y-4">
              {/* Name Field */}
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter name here"
                  {...register("name")}
                  className="mt-1"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                )}
              </div>

              {/* Affiliation Field */}
              <div>
                <Label htmlFor="affiliation" className="text-sm font-medium text-gray-700">
                  Affiliation (Department & Institution Name) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="affiliation"
                  type="text"
                  placeholder="e.g. Division of Biological Sciences - UPV CAS"
                  {...register("affiliation")}
                  className="mt-1"
                />
                {errors.affiliation && (
                  <p className="text-red-500 text-sm mt-1">{errors.affiliation.message}</p>
                )}
              </div>

              {/* Designation Field */}
              <div>
                <Label htmlFor="designation" className="text-sm font-medium text-gray-700">
                  Designation <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="designation"
                  type="text"
                  placeholder="Enter designation here"
                  {...register("designation")}
                  className="mt-1"
                />
                {errors.designation && (
                  <p className="text-red-500 text-sm mt-1">{errors.designation.message}</p>
                )}
              </div>

              {/* Select Service */}
              <div>
                <Label htmlFor="service" className="text-sm font-medium text-gray-700">
                  Select Service:
                </Label>
                <Select onValueChange={handleServiceChange} defaultValue="laboratory">
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="laboratory">Laboratory Service</SelectItem>
                    <SelectItem value="research">Research and Collaboration</SelectItem>
                  </SelectContent>
                </Select>
                {errors.service && (
                  <p className="text-red-500 text-sm mt-1">{errors.service.message}</p>
                )}
              </div>
            </div>

            {/* Dynamic Fields Section */}
            <div className="border-t pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Please answer the following:</h2>
              
              {selectedService === "laboratory" && (
                <div className="space-y-4">
                  {/* Workflow Selection */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-3 block">
                      Kindly choose which workflow you will be availing?
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      {([
                        { id: "dna-extraction", label: "DNA extraction" },
                        { id: "sequencing", label: "Sequencing" },
                        { id: "pcr-amplification", label: "PCR amplification" },
                        { id: "bioinformatics", label: "Bioinformatics" },
                        { id: "quantification", label: "Quantification" },
                        { id: "complete-workflow", label: "Complete Workflow" }
                      ] as Array<{ id: WorkflowOption; label: string }>).map((workflow) => (
                        <div key={workflow.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={workflow.id}
                            checked={formData.workflows?.includes(workflow.id) || false}
                            onChange={(e) => handleWorkflowChange(workflow.id, e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <Label htmlFor={workflow.id} className="text-sm text-gray-700">
                            {workflow.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {errors.workflows && (
                      <p className="text-red-500 text-sm mt-1">{errors.workflows.message}</p>
                    )}
                  </div>

                  {/* Additional Information */}
                  <div>
                    <Label htmlFor="additionalInfo" className="text-sm font-medium text-gray-700">
                      Do you have questions or any other additional information?
                    </Label>
                    <Textarea
                      id="additionalInfo"
                      placeholder="Enter a description..."
                      {...register("additionalInfo")}
                      className="mt-1"
                      rows={4}
                    />
                    {errors.additionalInfo && (
                      <p className="text-red-500 text-sm mt-1">{errors.additionalInfo.message}</p>
                    )}
                  </div>
                </div>
              )}

              {selectedService === "research" && (
                <div className="space-y-4">
                  {/* Project Background */}
                  <div>
                    <Label htmlFor="projectBackground" className="text-sm font-medium text-gray-700">
                      Indicate a brief background of the project and required molecular workflow
                    </Label>
                    <Textarea
                      id="projectBackground"
                      placeholder="Enter a description..."
                      {...register("projectBackground")}
                      className="mt-1"
                      rows={4}
                    />
                    {errors.projectBackground && (
                      <p className="text-red-500 text-sm mt-1">{errors.projectBackground.message}</p>
                    )}
                  </div>

                  {/* Project Budget */}
                  <div>
                    <Label htmlFor="projectBudget" className="text-sm font-medium text-gray-700">
                      Indicate project budget for molecular workflow
                    </Label>
                    <Input
                      id="projectBudget"
                      type="text"
                      placeholder="₱"
                      {...register("projectBudget")}
                      className="mt-1"
                    />
                    {errors.projectBudget && (
                      <p className="text-red-500 text-sm mt-1">{errors.projectBudget.message}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
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
    </div>
  )
}