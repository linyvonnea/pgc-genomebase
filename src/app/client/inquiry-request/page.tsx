"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function QuotationRequestForm() {
  const [selectedService, setSelectedService] = useState<string>("laboratory")
  const [formData, setFormData] = useState({
    name: "",
    affiliation: "",
    designation: "",
    service: "laboratory",
    // Laboratory Service fields
    workflows: [] as string[],
    additionalInfo: "",
    // Research and Collaboration fields
    projectBackground: "",
    projectBudget: ""
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleWorkflowChange = (workflow: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      workflows: checked 
        ? [...prev.workflows, workflow]
        : prev.workflows.filter(w => w !== workflow)
    }))
  }

  const handleServiceChange = (value: string) => {
    setSelectedService(value)
    setFormData(prev => ({
      ...prev,
      service: value,
      // Reset service-specific fields when switching
      workflows: [],
      additionalInfo: "",
      projectBackground: "",
      projectBudget: ""
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    console.log("Form submitted:", formData)
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

          <form onSubmit={handleSubmit} className="space-y-6">
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
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="mt-1"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">This is a hint text to help user.</p>
              </div>

              {/* Affiliation Field */}
              <div>
                <Label htmlFor="affiliation" className="text-sm font-medium text-gray-700">
                  Affiliation (Department & Institution Name) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="affiliation"
                  type="text"
                  placeholder="e.g. Department - Institution"
                  value={formData.affiliation}
                  onChange={(e) => handleInputChange("affiliation", e.target.value)}
                  className="mt-1"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">This is a hint text to help user.</p>
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
                  value={formData.designation}
                  onChange={(e) => handleInputChange("designation", e.target.value)}
                  className="mt-1"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">This is a hint text to help user.</p>
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
                      {[
                        { id: "dna-extraction", label: "DNA extraction" },
                        { id: "sequencing", label: "Sequencing" },
                        { id: "pcr-amplification", label: "PCR amplification" },
                        { id: "bioinformatics", label: "Bioinformatics" },
                        { id: "quantification", label: "Quantification" },
                        { id: "complete-workflow", label: "Complete Workflow" }
                      ].map((workflow) => (
                        <div key={workflow.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={workflow.id}
                            checked={formData.workflows.includes(workflow.id)}
                            onChange={(e) => handleWorkflowChange(workflow.id, e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <Label htmlFor={workflow.id} className="text-sm text-gray-700">
                            {workflow.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div>
                    <Label htmlFor="additionalInfo" className="text-sm font-medium text-gray-700">
                      Do you have questions or any other additional information?
                    </Label>
                    <Textarea
                      id="additionalInfo"
                      placeholder="Enter a description..."
                      value={formData.additionalInfo}
                      onChange={(e) => handleInputChange("additionalInfo", e.target.value)}
                      className="mt-1"
                      rows={4}
                    />
                    <p className="text-xs text-gray-500 mt-1">This is a hint text to help user.</p>
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
                      value={formData.projectBackground}
                      onChange={(e) => handleInputChange("projectBackground", e.target.value)}
                      className="mt-1"
                      rows={4}
                    />
                    <p className="text-xs text-gray-500 mt-1">This is a hint text to help user.</p>
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
                      value={formData.projectBudget}
                      onChange={(e) => handleInputChange("projectBudget", e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">This is a hint text to help user.</p>
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