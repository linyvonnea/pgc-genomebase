"use client";

import { useState } from "react";
import { Admin, AdminRole, ADMIN_ROLES } from "@/services/adminService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminRole } from "@/hooks/useAdminRole";
import { canEdit, canDelete, canManageAdmins } from "@/lib/permissions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { saveAdmin, deleteAdmin } from "@/services/adminService";
import { Shield, User, Mail, Briefcase, Save, Trash2, AlertCircle } from "lucide-react";

interface AdminModalProps {
  admin: Admin | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdminModal({ admin, onClose, onSuccess }: AdminModalProps) {
  const isEdit = !!admin;
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { role: currentUserRole } = useAdminRole();
  
  const canEditAdmin = canEdit(currentUserRole, "admin");
  const canDeleteAdmin = canDelete(currentUserRole, "admin");
  const canManage = canManageAdmins(currentUserRole);

  const [formData, setFormData] = useState({
    email: admin?.email || "",
    name: admin?.name || "",
    position: admin?.position || "",
    photoURL: admin?.photoURL || "",
    role: admin?.role || "admin" as AdminRole,
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.email || !formData.name || !formData.position || !formData.role) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const adminData: Admin = {
        uid: formData.email,
        email: formData.email,
        name: formData.name,
        position: formData.position,
        role: formData.role,
        photoURL: formData.photoURL || undefined,
        createdAt: admin?.createdAt || new Date(),
        lastLogin: admin?.lastLogin || null,
      };

      await saveAdmin(adminData);
      toast.success(isEdit ? "Admin updated successfully!" : "Admin added successfully!");
      onSuccess();
    } catch (error) {
      console.error("Error saving admin:", error);
      toast.error("Failed to save admin");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to remove this admin? This action cannot be undone.")) {
      return;
    }

    setDeleteLoading(true);
    try {
      await deleteAdmin(formData.email);
      toast.success("Admin removed successfully!");
      onSuccess();
    } catch (error) {
      console.error("Error deleting admin:", error);
      toast.error("Failed to remove admin");
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
              <Shield className="h-3 w-3 mr-1" />
              {isEdit ? "Edit Admin" : "Add New Admin"}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update admin information and access permissions"
              : "Create a new administrator account with system access"}
          </DialogDescription>
        </DialogHeader>

        {!canEditAdmin && isEdit && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              You have view-only access. Contact a Super Admin to make changes to this admin account.
            </p>
          </div>
        )}

        {!isEdit && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              The admin must sign in with their Google account matching the email address provided below
              to access the system.
            </p>
          </div>
        )}

        <div className="space-y-6">
          {/* Admin Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <User className="h-4 w-4 text-blue-600" />
              Admin Information
            </div>
            <Separator />

            <div className="space-y-2">
              <Label htmlFor="email">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  disabled={isEdit}
                  className="pl-9"
                />
              </div>
              {!isEdit && (
                <p className="text-xs text-muted-foreground">
                  This email will be used for Google Sign-In authentication
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Enter full name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  disabled={isEdit && !canEditAdmin}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">
                  Position/Title <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="position"
                    placeholder="e.g., Director, Manager"
                    value={formData.position}
                    onChange={(e) => handleChange("position", e.target.value)}
                    className="pl-9"
                    disabled={isEdit && !canEditAdmin}
                  />
                </div>
              </div>
            </div>

            {/* Role Selector */}
            <div className="space-y-2">
              <Label htmlFor="role">
                Role <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value) => handleChange("role", value as AdminRole)}
                disabled={isEdit && !canEditAdmin}
              >
                <SelectTrigger className="w-full">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Select a role" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {ADMIN_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div className="flex flex-col py-1">
                        <span className="font-medium">{role.label}</span>
                        <span className="text-xs text-muted-foreground">{role.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="photoURL">Profile Photo URL (Optional)</Label>
              <Input
                id="photoURL"
                type="url"
                placeholder="https://example.com/photo.jpg"
                value={formData.photoURL}
                onChange={(e) => handleChange("photoURL", e.target.value)}
                disabled={isEdit && !canEditAdmin}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use Google account photo
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4">
            {isEdit && canDeleteAdmin && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteLoading || loading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deleteLoading ? "Removing..." : "Remove Admin"}
              </Button>
            )}
            <div className={`flex gap-2 ${!isEdit || !canDeleteAdmin ? "w-full justify-end" : ""}`}>
              <Button variant="outline" onClick={onClose} disabled={loading || deleteLoading}>
                Cancel
              </Button>
              {(canEditAdmin || !isEdit) && (
                <Button
                  onClick={handleSubmit}
                  disabled={loading || deleteLoading || (isEdit && !canEditAdmin)}
                  className="shadow-md"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "Saving..." : isEdit ? "Save Changes" : "Add Admin"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
