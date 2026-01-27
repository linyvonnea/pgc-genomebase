"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, Pencil, Trash2, GripVertical, Check, X, Settings } from "lucide-react";
import { toast } from "sonner";
import {
  getCatalogSettings,
  addCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
} from "@/services/catalogSettingsService";
import { CatalogSettings, CatalogItem, CatalogType, CATALOG_LABELS } from "@/types/CatalogSettings";
import { Badge } from "@/components/ui/badge";

export default function CatalogManagementPage() {
  const [catalogs, setCatalogs] = useState<CatalogSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<{ type: CatalogType; id: string; value: string; position?: string } | null>(null);
  const [newItemValue, setNewItemValue] = useState<Record<CatalogType, string>>({
    sendingInstitutions: "",
    fundingCategories: "",
    fundingInstitutions: "",
    serviceRequested: "",
    personnelAssigned: "",
  });
  const [newPersonnelPosition, setNewPersonnelPosition] = useState("");

  useEffect(() => {
    loadCatalogs();
  }, []);

  const loadCatalogs = async () => {
    try {
      setLoading(true);
      const data = await getCatalogSettings();
      setCatalogs(data);
    } catch (error) {
      toast.error("Failed to load catalog settings");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (type: CatalogType) => {
    const value = newItemValue[type].trim();
    if (!value) {
      toast.error("Please enter a value");
      return;
    }

    // For personnel, validate position is also provided
    if (type === "personnelAssigned" && !newPersonnelPosition.trim()) {
      toast.error("Please enter both name and position");
      return;
    }

    try {
      const itemData = type === "personnelAssigned" 
        ? { value, position: newPersonnelPosition.trim() }
        : value;
      await addCatalogItem(type, itemData as any);
      setNewItemValue((prev) => ({ ...prev, [type]: "" }));
      setNewPersonnelPosition("");
      await loadCatalogs();
      toast.success("Item added successfully");
    } catch (error) {
      toast.error("Failed to add item");
      console.error(error);
    }
  };

  const handleUpdateItem = async (type: CatalogType, itemId: string, newValue: string, newPosition?: string) => {
    if (!newValue.trim()) {
      toast.error("Value cannot be empty");
      return;
    }

    try {
      const updates: any = { value: newValue };
      if (type === "personnelAssigned" && newPosition !== undefined) {
        updates.position = newPosition;
      }
      await updateCatalogItem(type, itemId, updates);
      setEditingItem(null);
      await loadCatalogs();
      toast.success("Item updated successfully");
    } catch (error) {
      toast.error("Failed to update item");
      console.error(error);
    }
  };

  const handleDeleteItem = async (type: CatalogType, itemId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      await deleteCatalogItem(type, itemId);
      await loadCatalogs();
      toast.success("Item deleted successfully");
    } catch (error) {
      toast.error("Failed to delete item");
      console.error(error);
    }
  };

  const handleToggleActive = async (type: CatalogType, item: CatalogItem) => {
    try {
      await updateCatalogItem(type, item.id, { isActive: !item.isActive });
      await loadCatalogs();
      toast.success(item.isActive ? "Item deactivated" : "Item activated");
    } catch (error) {
      toast.error("Failed to update item status");
      console.error(error);
    }
  };

  const renderCatalogSection = (type: CatalogType, items: CatalogItem[]) => {
    const sortedItems = [...items].sort((a, b) => a.order - b.order);

    return (
      <Card key={type}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" />
            {CATALOG_LABELS[type]}
          </CardTitle>
          <CardDescription>
            Manage options for {CATALOG_LABELS[type].toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Add new item */}
          {type === "personnelAssigned" ? (
            <div className="space-y-2">
              <Input
                placeholder="Enter name..."
                value={newItemValue[type]}
                onChange={(e) =>
                  setNewItemValue((prev) => ({ ...prev, [type]: e.target.value }))
                }
                className="h-9"
              />
              <div className="flex gap-2">
                <Input
                  placeholder="Enter position..."
                  value={newPersonnelPosition}
                  onChange={(e) => setNewPersonnelPosition(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddItem(type);
                  }}
                  className="h-9 flex-1"
                />
                <Button onClick={() => handleAddItem(type)} size="sm" className="shrink-0">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder="Add new item..."
                value={newItemValue[type]}
                onChange={(e) =>
                  setNewItemValue((prev) => ({ ...prev, [type]: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddItem(type);
                }}
                className="h-9"
              />
              <Button onClick={() => handleAddItem(type)} size="sm" className="shrink-0">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          )}

          <Separator />

          {/* List of items */}
          <div className="space-y-2">
            {sortedItems.length === 0 ? (
              <p className="text-sm text-gray-500 italic py-4 text-center">No items yet</p>
            ) : (
              sortedItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border ${
                    item.isActive ? "bg-white" : "bg-gray-50 opacity-60"
                  }`}
                >
                  <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                  
                  {editingItem?.id === item.id ? (
                    <>
                      {type === "personnelAssigned" ? (
                        <div className="flex-1 flex flex-col gap-2">
                          <Input
                            value={editingItem.value}
                            onChange={(e) =>
                              setEditingItem({ ...editingItem, value: e.target.value })
                            }
                            placeholder="Name"
                            className="h-8"
                            autoFocus
                          />
                          <Input
                            value={editingItem.position || ""}
                            onChange={(e) =>
                              setEditingItem({ ...editingItem, position: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                handleUpdateItem(type, item.id, editingItem.value, editingItem.position);
                              if (e.key === "Escape") setEditingItem(null);
                            }}
                            placeholder="Position"
                            className="h-8"
                          />
                        </div>
                      ) : (
                        <Input
                          value={editingItem.value}
                          onChange={(e) =>
                            setEditingItem({ ...editingItem, value: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              handleUpdateItem(type, item.id, editingItem.value);
                            if (e.key === "Escape") setEditingItem(null);
                          }}
                          className="h-8 flex-1"
                          autoFocus
                        />
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUpdateItem(type, item.id, editingItem.value, editingItem.position)}
                        className="h-8 w-8 p-0"
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingItem(null)}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </>
                  ) : (
                    <>
                      {type === "personnelAssigned" ? (
                        <div className="flex-1">
                          <div className="text-sm font-medium">{item.value}</div>
                          {item.position && (
                            <div className="text-xs text-gray-500">{item.position}</div>
                          )}
                        </div>
                      ) : (
                        <span className="flex-1 text-sm">{item.value}</span>
                      )}
                      {!item.isActive && (
                        <Badge variant="secondary" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setEditingItem({ type, id: item.id, value: item.value, position: item.position })
                        }
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleActive(type, item)}
                        className="h-8 w-8 p-0"
                        title={item.isActive ? "Deactivate" : "Activate"}
                      >
                        {item.isActive ? (
                          <X className="h-4 w-4 text-orange-600" />
                        ) : (
                          <Check className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteItem(type, item.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading catalog settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Catalog Management</h1>
        <p className="text-gray-600 mt-2">
          Manage dropdown options and reference data used throughout the application
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {catalogs && (
          <>
            {renderCatalogSection("sendingInstitutions", catalogs.sendingInstitutions)}
            {renderCatalogSection("fundingCategories", catalogs.fundingCategories)}
            {renderCatalogSection("fundingInstitutions", catalogs.fundingInstitutions)}
            {renderCatalogSection("serviceRequested", catalogs.serviceRequested)}
            {renderCatalogSection("personnelAssigned", catalogs.personnelAssigned)}
          </>
        )}
      </div>
    </div>
  );
}
