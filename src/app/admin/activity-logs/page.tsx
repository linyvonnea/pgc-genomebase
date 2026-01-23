"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getActivityLogs, ActivityLog, EntityType, ActionType } from "@/services/activityLogService";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Eye, Download, RefreshCw } from "lucide-react";

export default function ActivityLogsPage() {
  const [entityTypeFilter, setEntityTypeFilter] = useState<EntityType | "all">("all");
  const [actionFilter, setActionFilter] = useState<ActionType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["activityLogs", entityTypeFilter, actionFilter],
    queryFn: () => getActivityLogs({
      entityType: entityTypeFilter !== "all" ? entityTypeFilter : undefined,
      action: actionFilter !== "all" ? actionFilter : undefined,
      limitCount: 100,
    }),
  });

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      log.entityId.toLowerCase().includes(search) ||
      log.entityName?.toLowerCase().includes(search) ||
      log.userEmail.toLowerCase().includes(search) ||
      log.userName?.toLowerCase().includes(search) ||
      log.description?.toLowerCase().includes(search)
    );
  });

  const getActionColor = (action: ActionType) => {
    switch (action) {
      case "CREATE": return "bg-green-100 text-green-800";
      case "UPDATE": return "bg-blue-100 text-blue-800";
      case "DELETE": return "bg-red-100 text-red-800";
      case "GENERATE": return "bg-purple-100 text-purple-800";
      case "DOWNLOAD": return "bg-orange-100 text-orange-800";
      case "VIEW": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const exportToCSV = () => {
    const headers = ["Timestamp", "User", "Action", "Entity Type", "Entity ID", "Entity Name", "Description"];
    const rows = filteredLogs.map(log => {
      const timestamp = log.timestamp instanceof Date 
        ? log.timestamp 
        : (log.timestamp as any).toDate 
          ? (log.timestamp as any).toDate() 
          : new Date();
      
      return [
        timestamp.toLocaleString(),
        log.userEmail,
        log.action,
        log.entityType,
        log.entityId,
        log.entityName || "",
        log.description || "",
      ];
    });

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Activity Logs</h1>
          <p className="text-muted-foreground mt-1">
            View all system activities and changes ({filteredLogs.length} logs)
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportToCSV} variant="outline" size="sm" disabled={filteredLogs.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Search by ID, name, user, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          
          <Select value={entityTypeFilter} onValueChange={(value: any) => setEntityTypeFilter(value)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Entity Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="client">Client</SelectItem>
              <SelectItem value="project">Project</SelectItem>
              <SelectItem value="inquiry">Inquiry</SelectItem>
              <SelectItem value="quotation">Quotation</SelectItem>
              <SelectItem value="charge_slip">Charge Slip</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>

          <Select value={actionFilter} onValueChange={(value: any) => setActionFilter(value)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="CREATE">Create</SelectItem>
              <SelectItem value="UPDATE">Update</SelectItem>
              <SelectItem value="DELETE">Delete</SelectItem>
              <SelectItem value="GENERATE">Generate</SelectItem>
              <SelectItem value="DOWNLOAD">Download</SelectItem>
              <SelectItem value="VIEW">View</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead className="w-[200px]">User</TableHead>
                <TableHead className="w-[100px]">Action</TableHead>
                <TableHead className="w-[150px]">Entity Type</TableHead>
                <TableHead className="w-[150px]">Entity ID</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[80px]">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-32">
                    <div className="flex items-center justify-center">
                      <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                      Loading logs...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">
                    No activity logs found. Try adjusting your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => {
                  const timestamp = log.timestamp instanceof Date 
                    ? log.timestamp 
                    : (log.timestamp as any).toDate 
                      ? (log.timestamp as any).toDate() 
                      : new Date();
                  
                  return (
                  <TableRow key={log.id} className="hover:bg-muted/50">
                    <TableCell className="text-sm font-mono">
                      {timestamp.toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{log.userName || "Unknown"}</div>
                        <div className="text-muted-foreground text-xs truncate max-w-[180px]">
                          {log.userEmail}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getActionColor(log.action)} variant="secondary">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium capitalize">
                        {log.entityType.replace("_", " ")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {log.entityId}
                      </code>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="text-sm truncate" title={log.description || log.entityName}>
                        {log.description || log.entityName || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Activity Log Details</DialogTitle>
                            <DialogDescription>
                              Complete information about this activity
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            {/* Summary */}
                            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Timestamp</div>
                                <div className="text-sm font-medium">
                                  {timestamp.toLocaleString()}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Action</div>
                                <Badge className={getActionColor(log.action)}>{log.action}</Badge>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">User</div>
                                <div className="text-sm font-medium">{log.userName || "Unknown"}</div>
                                <div className="text-xs text-muted-foreground">{log.userEmail}</div>
                                {log.userRole && (
                                  <div className="text-xs text-muted-foreground">Role: {log.userRole}</div>
                                )}
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Entity</div>
                                <div className="text-sm font-medium capitalize">
                                  {log.entityType.replace("_", " ")}
                                </div>
                                <code className="text-xs bg-background px-1.5 py-0.5 rounded">
                                  {log.entityId}
                                </code>
                              </div>
                            </div>

                            {/* Description */}
                            {log.description && (
                              <div className="p-4 bg-muted/30 rounded-lg">
                                <div className="text-xs text-muted-foreground mb-1">Description</div>
                                <p className="text-sm">{log.description}</p>
                              </div>
                            )}

                            {/* Changed Fields */}
                            {log.changedFields && log.changedFields.length > 0 && (
                              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                                <div className="text-xs text-muted-foreground mb-2">
                                  Changed Fields ({log.changedFields.length})
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {log.changedFields.map((field) => (
                                    <Badge key={field} variant="outline" className="font-mono text-xs">
                                      {field}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Before/After */}
                            <div className="grid grid-cols-2 gap-4">
                              {log.changesBefore && (
                                <div className="space-y-2">
                                  <div className="text-xs font-semibold text-muted-foreground">
                                    Before Changes
                                  </div>
                                  <pre className="text-xs bg-red-50 dark:bg-red-950/20 p-3 rounded border overflow-x-auto">
                                    {JSON.stringify(log.changesBefore, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.changesAfter && (
                                <div className="space-y-2">
                                  <div className="text-xs font-semibold text-muted-foreground">
                                    After Changes
                                  </div>
                                  <pre className="text-xs bg-green-50 dark:bg-green-950/20 p-3 rounded border overflow-x-auto">
                                    {JSON.stringify(log.changesAfter, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
