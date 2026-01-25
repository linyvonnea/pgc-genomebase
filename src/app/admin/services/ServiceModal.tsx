"use client";

import { useState, useEffect } from "react";
import { ServiceItem } from "@/types/ServiceItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { saveService, deleteService } from "@/services/serviceCatalogService";
import { FileText, DollarSign, Settings, Save, Trash2 } from "lucide-react";

interface ServiceModalProps {
  service: ServiceItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ServiceModal({ service, onClose, onSuccess }: ServiceModalProps) {
  const isEdit = !!service;
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [formData, setFormData] = useState({
    id: service?.id || "",
    name: service?.name || "",
    category: service?.category || "",
    type: service?.type || "laboratory",
    unit: service?.unit || "",
    price: service?.price || 0,
    description: service?.description || "",
    minQuantity: service?.minQuantity || undefined,
    additionalUnitPrice: service?.additionalUnitPrice || undefined,
    minParticipants: service?.minParticipants || undefined,
    additionalParticipantPrice: service?.additionalParticipantPrice || undefined,
  });

  const showBioinformaticsFields = formData.type === "bioinformatics";
  const showTrainingFields = formData.type === "training";

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name || !formData.category || !formData.unit || !formData.price) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!formData.id && !isEdit) {
      toast.error("Service ID is required");
      return;
    }

    setLoading(true);
    try {
      const serviceData: ServiceItem = {
        id: formData.id,
        name: formData.name,
        category: formData.category,
        type: formData.type as any,
        unit: formData.unit,
        price: Number(formData.price),
        description: formData.description || undefined,
        minQuantity: formData.minQuantity ? Number(formData.minQuantity) : undefined,
        additionalUnitPrice: formData.additionalUnitPrice
          ? Number(formData.additionalUnitPrice)
          : undefined,
        minParticipants: formData.minParticipants
          ? Number(formData.minParticipants)
          : undefined,
        additionalParticipantPrice: formData.additionalParticipantPrice
          ? Number(formData.additionalParticipantPrice)
          : undefined,
      };

      await saveService(serviceData);
      toast.success(isEdit ? "Service updated successfully!" : "Service added successfully!");
      onSuccess();
    } catch (error) {
      console.error("Error saving service:", error);
      toast.error("Failed to save service");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this service? This action cannot be undone.")) {
      return;
    }

    setDeleteLoading(true);
    try {
      await deleteService(formData.id);
      toast.success("Service deleted successfully!");
      onSuccess();
    } catch (error) {
      console.error("Error deleting service:", error);
      toast.error("Failed to delete service");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge className="bg-blue-100 text-blue-700">
              <FileText className="h-3 w-3 mr-1" />
              {isEdit ? "Edit Service" : "Add New Service"}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update service information and pricing configuration"
              : "Create a new service with pricing and configuration details"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <FileText className="h-4 w-4 text-blue-600" />
              Basic Information
            </div>
            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="id">
                  Service ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="id"
                  placeholder="e.g., TRG-SVC-001"
                  value={formData.id}
                  onChange={(e) => handleChange("id", e.target.value)}
                  disabled={isEdit}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">
                  Service Type <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.type} onValueChange={(val) => handleChange("type", val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="laboratory">laboratory</SelectItem>
                    <SelectItem value="equipment">equipment</SelectItem>
                    <SelectItem value="bioinformatics">bioinformatics</SelectItem>
                    <SelectItem value="retail">retail</SelectItem>
                    <SelectItem value="training">training</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                Service Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Enter service name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">
                  Category <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="category"
                  placeholder="e.g., Trainings, Genomics"
                  value={formData.category}
                  onChange={(e) => handleChange("category", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">
                  Unit <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="unit"
                  placeholder="e.g., Per hour, Per sample"
                  value={formData.unit}
                  onChange={(e) => handleChange("unit", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional service description"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <DollarSign className="h-4 w-4 text-green-600" />
              Pricing Configuration
            </div>
            <Separator />

            <div className="space-y-2">
              <Label htmlFor="price">
                Base Price <span className="text-red-500">*</span>
              </Label>
              <Input
                id="price"
                type="number"
                placeholder="0.00"
                value={formData.price || ""}
                onChange={(e) => handleChange("price", e.target.value)}
              />
            </div>
          </div>

          {/* Bioinformatics Special Pricing */}
          {showBioinformaticsFields && (
            <div className="space-y-4 bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 text-sm font-semibold text-purple-700">
                <Settings className="h-4 w-4" />
                Bioinformatics Tiered Pricing
              </div>
              <Separator className="bg-purple-200" />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minQuantity">Minimum Samples</Label>
                  <Input
                    id="minQuantity"
                    type="number"
                    placeholder="e.g., 9"
                    value={formData.minQuantity || ""}
                    onChange={(e) => handleChange("minQuantity", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Base price covers up to this many samples
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="additionalUnitPrice">Additional Price per Sample</Label>
                  <Input
                    id="additionalUnitPrice"
                    type="number"
                    placeholder="0.00"
                    value={formData.additionalUnitPrice || ""}
                    onChange={(e) => handleChange("additionalUnitPrice", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Price for each sample above minimum
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Training Special Pricing */}
          {showTrainingFields && (
            <div className="space-y-4 bg-indigo-50 p-4 rounded-lg border border-indigo-200">
              <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700">
                <Settings className="h-4 w-4" />
                Training Tiered Pricing
              </div>
              <Separator className="bg-indigo-200" />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minParticipants">Minimum Participants</Label>
                  <Input
                    id="minParticipants"
                    type="number"
                    placeholder="e.g., 6"
                    value={formData.minParticipants || ""}
                    onChange={(e) => handleChange("minParticipants", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Base price covers up to this many participants
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="additionalParticipantPrice">
                    Additional Price per Participant
                  </Label>
                  <Input
                    id="additionalParticipantPrice"
                    type="number"
                    placeholder="0.00"
                    value={formData.additionalParticipantPrice || ""}
                    onChange={(e) => handleChange("additionalParticipantPrice", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Price for each participant above minimum
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between pt-4">
            {isEdit && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteLoading || loading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deleteLoading ? "Deleting..." : "Delete"}
              </Button>
            )}
            <div className={`flex gap-2 ${!isEdit ? "w-full" : ""}`}>
              <Button variant="outline" onClick={onClose} disabled={loading || deleteLoading}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || deleteLoading}
                className={`shadow-md ${!isEdit ? "flex-1" : ""}`}
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Saving..." : isEdit ? "Save Changes" : "Add Service"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
