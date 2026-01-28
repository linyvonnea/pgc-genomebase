"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getServiceCatalog } from "@/services/serviceCatalogService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useAuth from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Search, LayoutGrid, Table as TableIcon } from "lucide-react";
import ServiceModal from "./ServiceModal";
import { ServiceItem } from "@/types/ServiceItem";
import { PermissionGuard } from "@/components/PermissionGuard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ServicesManagementPage() {
  return (
    <PermissionGuard module="serviceCatalog" action="view">
      <ServicesManagementContent />
    </PermissionGuard>
  );
}

function ServicesManagementContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "grouped">("grouped");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const queryClient = useQueryClient();
  const { adminInfo } = useAuth();
  const { canCreate, canEdit } = usePermissions(adminInfo?.role);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["serviceCatalog"],
    queryFn: getServiceCatalog,
  });

  const filteredServices = services.filter((service) => {
    const matchesSearch =
      !searchQuery ||
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType =
      typeFilter === "all" || service.type === typeFilter;

    return matchesSearch && matchesType;
  });

  const handleAdd = () => {
    setEditingService(null);
    setIsModalOpen(true);
  };

  const handleEdit = (service: ServiceItem) => {
    setEditingService(service);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingService(null);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["serviceCatalog"] });
    handleModalClose();
  };

  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      Laboratory: "bg-blue-100 text-blue-800",
      Equipment: "bg-green-100 text-green-800",
      Bioinformatics: "bg-purple-100 text-purple-800",
      Retail: "bg-orange-100 text-orange-800",
      Training: "bg-indigo-100 text-indigo-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  // Group services by type
  const groupedServices = filteredServices.reduce((acc, service) => {
    if (!acc[service.type]) {
      acc[service.type] = [];
    }
    acc[service.type].push(service);
    return acc;
  }, {} as Record<string, ServiceItem[]>);

  const serviceTypes = ["Bioinformatics", "Laboratory", "Equipment", "Retail", "Training"];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Service Catalog Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage all services, pricing, and configurations ({filteredServices.length} services)
          </p>
        </div>
        {canCreate("serviceCatalog") && (
          <Button onClick={handleAdd} className="shadow-md">
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-3 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Service Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Bioinformatics">Bioinformatics</SelectItem>
              <SelectItem value="Laboratory">Laboratory</SelectItem>
              <SelectItem value="Equipment">Equipment</SelectItem>
              <SelectItem value="Retail">Retail</SelectItem>
              <SelectItem value="Training">Training</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-1 border rounded-md">
            <Button
              variant={viewMode === "grouped" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grouped")}
              className="rounded-r-none"
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              Grouped
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="rounded-l-none"
            >
              <TableIcon className="h-4 w-4 mr-1" />
              Table
            </Button>
          </div>
        </div>
      </Card>

      {/* Grouped View */}
      {viewMode === "grouped" ? (
        <div className="space-y-4">
          {isLoading ? (
            <Card className="p-8">
              <div className="text-center text-muted-foreground">Loading services...</div>
            </Card>
          ) : filteredServices.length === 0 ? (
            <Card className="p-8">
              <div className="text-center text-muted-foreground">
                No services found. Try adjusting your filters or add a new service.
              </div>
            </Card>
          ) : (
            serviceTypes.map((type) => {
              const servicesInType = groupedServices[type] || [];
              if (servicesInType.length === 0 && typeFilter !== "all") return null;
              
              return (
                <Card key={type} className="overflow-hidden">
                  <div className={`px-6 py-4 border-b ${getTypeBadgeColor(type)} bg-opacity-50`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className={getTypeBadgeColor(type)}>
                          {type}
                        </Badge>
                        <span className="font-semibold text-lg">{type}</span>
                        <span className="text-sm text-muted-foreground">
                          ({servicesInType.length} service{servicesInType.length !== 1 ? 's' : ''})
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="divide-y">
                    {servicesInType.length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground text-sm">
                        No services in this category yet
                      </div>
                    ) : (
                      servicesInType.map((service) => {
                        const hasSpecialPricing =
                          (service.type === "Bioinformatics" &&
                            service.minQuantity &&
                            service.additionalUnitPrice) ||
                          (service.type === "Training" &&
                            service.minParticipants &&
                            service.additionalParticipantPrice);

                        return (
                          <div
                            key={service.id}
                            className="px-6 py-4 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex items-center gap-3">
                                  <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                    {service.id}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {service.category}
                                  </Badge>
                                  {hasSpecialPricing && (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                                      Tiered Pricing
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="pl-4 border-l-2 border-muted">
                                  <h4 className="font-medium text-base truncate max-w-2xl" title={service.name}>
                                    {service.name}
                                  </h4>
                                  {service.description && (
                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                      {service.description}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-4 mt-2 text-sm">
                                    <span className="text-muted-foreground">
                                      <span className="font-medium">Unit:</span> {service.unit}
                                    </span>
                                    <span className="text-green-700 font-semibold">
                                      ₱{service.price.toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex gap-2 flex-shrink-0">
                                {canEdit("serviceCatalog") && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEdit(service)}
                                  >
                                    <Pencil className="h-4 w-4 mr-1" />
                                    Edit
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      ) : (
        /* Table View */
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">ID</TableHead>
                  <TableHead className="w-[250px]">Service Name</TableHead>
                  <TableHead className="w-[120px]">Type</TableHead>
                  <TableHead className="w-[150px]">Category</TableHead>
                  <TableHead className="w-[100px]">Unit</TableHead>
                  <TableHead className="w-[120px] text-right">Price</TableHead>
                  <TableHead className="w-[100px] text-center">Special Pricing</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-32">
                      Loading services...
                    </TableCell>
                  </TableRow>
                ) : filteredServices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-32 text-muted-foreground">
                      No services found. Try adjusting your filters or add a new service.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredServices.map((service) => {
                    const hasSpecialPricing =
                      (service.type === "Bioinformatics" &&
                        service.minQuantity &&
                        service.additionalUnitPrice) ||
                      (service.type === "Training" &&
                        service.minParticipants &&
                        service.additionalParticipantPrice);

                    return (
                      <TableRow key={service.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">{service.id}</TableCell>
                        <TableCell className="font-medium">
                          <div className="max-w-[250px] truncate" title={service.name}>
                            {service.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getTypeBadgeColor(service.type)}>
                            {service.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {service.category}
                        </TableCell>
                        <TableCell className="text-sm">{service.unit}</TableCell>
                        <TableCell className="text-right font-medium">
                          ₱{service.price.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          {hasSpecialPricing && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              ✓
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {canEdit("serviceCatalog") && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(service)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Modal */}
      {isModalOpen && (
        <ServiceModal
          service={editingService}
          onClose={handleModalClose}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
