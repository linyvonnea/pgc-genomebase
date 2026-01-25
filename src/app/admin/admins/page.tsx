"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAllAdmins } from "@/services/adminService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminRole } from "@/hooks/useAdminRole";
import { canManageAdmins, canEdit, canDelete } from "@/lib/permissions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Pencil, Search, Shield } from "lucide-react";
import AdminModal from "./AdminModal";
import { Admin } from "@/services/adminService";

export default function AdminsManagementPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const queryClient = useQueryClient();
  const { role: currentUserRole, loading: roleLoading } = useAdminRole();

  const canManage = canManageAdmins(currentUserRole);
  const canEditAdmin = canEdit(currentUserRole, "admin");
  const canDeleteAdmin = canDelete(currentUserRole, "admin");

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ["admins"],
    queryFn: getAllAdmins,
  });

  const filteredAdmins = admins.filter((admin) => {
    const matchesSearch =
      !searchQuery ||
      admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.position.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  const handleAdd = () => {
    setEditingAdmin(null);
    setIsModalOpen(true);
  };

  const handleEdit = (admin: Admin) => {
    setEditingAdmin(admin);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingAdmin(null);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["admins"] });
    handleModalClose();
  };

  const formatDate = (date: any) => {
    if (!date) return "N/A";
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString("en-US", { 
      year: "numeric", 
      month: "short", 
      day: "numeric" 
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            Users & Permissions
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage system users and their access levels ({filteredAdmins.length} users)
          </p>
        </div>
        {canManage && (
          <Button onClick={handleAdd} className="shadow-md">
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        )}
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or position..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]"></TableHead>
                <TableHead className="w-[200px]">Name</TableHead>
                <TableHead className="w-[250px]">Email</TableHead>
                <TableHead className="w-[180px]">Position</TableHead>
                <TableHead className="w-[100px]">Role</TableHead>
                <TableHead className="w-[130px]">Created At</TableHead>
                <TableHead className="w-[130px]">Last Login</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center h-32">
                    Loading admins...
                  </TableCell>
                </TableRow>
              ) : filteredAdmins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center h-32 text-muted-foreground">
                    No admins found. Try adjusting your search or add a new admin.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAdmins.map((admin) => (
                  <TableRow key={admin.email}>
                    <TableCell>
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={admin.photoURL} />
                        <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                          {admin.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">{admin.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{admin.email}</TableCell>
                    <TableCell className="text-sm">{admin.position}</TableCell>
                    <TableCell>
                      <Badge 
                        className={
                          admin.role === "super-admin" ? "bg-purple-100 text-purple-800" :
                          admin.role === "admin" ? "bg-blue-100 text-blue-800" :
                          admin.role === "moderator" ? "bg-green-100 text-green-800" :
                          "bg-gray-100 text-gray-800"
                        }
                      >
                        <Shield className="h-3 w-3 mr-1" />
                        {admin.role === "super-admin" ? "Super Admin" :
                         admin.role === "admin" ? "Admin" :
                         admin.role === "moderator" ? "Moderator" :
                         "Viewer"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(admin.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(admin.lastLogin)}
                    </TableCell>
                    <TableCell className="text-right">
                      {(canEditAdmin || canDeleteAdmin) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(admin)}
                          disabled={!canEditAdmin && !canDeleteAdmin}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Modal */}
      {isModalOpen && (
        <AdminModal
          admin={editingAdmin}
          onClose={handleModalClose}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
