"use client";

import { useEffect, useRef, useState } from "react";
import { db, storage } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import useAuth from "@/hooks/useAuth";
import { logActivity } from "@/services/activityLogService";
import { CheckCircle2, Clock, FileText, Loader2, Trash2, Upload, Download, Paperclip, X } from "lucide-react";
import { format } from "date-fns";
import { ServiceReport } from "@/services/serviceReportService";

interface Props {
  projectId: string;
}

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

function formatFileSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminServiceReport({ projectId }: Props) {
  const { adminInfo } = useAuth();
  const [reports, setReports] = useState<ServiceReport[]>([]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ServiceReport | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Real-time listener
  useEffect(() => {
    if (!projectId) return;
    const q = query(
      collection(db, "projects", projectId, "serviceReports"),
      orderBy("uploadedAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ServiceReport)));
    });
    return unsub;
  }, [projectId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error("File must be 20 MB or less.");
      return;
    }
    setPendingFile(file);
  };

  const handleUpload = async () => {
    const file = pendingFile;
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const ext = file.name.split(".").pop();
      const uniqueName = `${Date.now()}-${file.name}`;
      const path = `serviceReports/${projectId}/${uniqueName}`;
      const sRef = storageRef(storage, path);
      const task = uploadBytesResumable(sRef, file);

      await new Promise<void>((resolve, reject) => {
        task.on(
          "state_changed",
          (snap) => {
            setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
          },
          reject,
          resolve
        );
      });

      const fileUrl = await getDownloadURL(sRef);

      await addDoc(collection(db, "projects", projectId, "serviceReports"), {
        fileName: file.name,
        fileUrl,
        storagePath: path,
        fileSize: file.size,
        contentType: file.type,
        uploadedAt: serverTimestamp(),
        uploadedBy: adminInfo?.email || "system",
        uploadedByName: adminInfo?.name || "Admin",
        projectId,
      });

      await logActivity({
        userId: adminInfo?.email || "system",
        userEmail: adminInfo?.email || "system@pgc.admin",
        userName: adminInfo?.name || "System",
        action: "CREATE",
        entityType: "project",
        entityId: projectId,
        entityName: file.name,
        description: `Uploaded service report "${file.name}" for project ${projectId}`,
      });

      toast.success(`"${file.name}" uploaded successfully.`);
      setPendingFile(null);
    } catch (err) {
      console.error("Service report upload error:", err);
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (report: ServiceReport) => {
    setDeleting(report.id);
    try {
      // Delete from Storage
      if (report.storagePath) {
        try {
          await deleteObject(storageRef(storage, report.storagePath));
        } catch {
          // Storage object may already be gone — continue with Firestore delete
        }
      }
      await deleteDoc(doc(db, "projects", projectId, "serviceReports", report.id));

      await logActivity({
        userId: adminInfo?.email || "system",
        userEmail: adminInfo?.email || "system@pgc.admin",
        userName: adminInfo?.name || "System",
        action: "DELETE",
        entityType: "project",
        entityId: projectId,
        entityName: report.fileName,
        description: `Deleted service report "${report.fileName}" from project ${projectId}`,
      });

      toast.success(`"${report.fileName}" deleted.`);
    } catch (err) {
      console.error("Service report delete error:", err);
      toast.error("Delete failed.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-2">
      {/* Existing reports */}
      {reports.length === 0 ? (
        <p className="text-xs text-slate-400 ml-5">No service reports uploaded yet</p>
      ) : (
        <div className="space-y-1 ml-5">
          {reports.map((report) => {
            const uploadedAt =
              report.uploadedAt?.toDate
                ? format(report.uploadedAt.toDate(), "MMM d, yyyy")
                : "";
            const isReceived = report.status === "received";
            const receivedDate =
              report.receivedAt?.toDate
                ? format(report.receivedAt.toDate(), "MMM d, yyyy h:mm a")
                : "";
            return (
              <div
                key={report.id}
                className="flex items-center justify-between gap-2 py-1 border-b border-slate-50 last:border-0 group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <div className="min-w-0">
                    <a
                      href={report.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-blue-700 hover:underline truncate block"
                      title={report.fileName}
                    >
                      {report.fileName}
                    </a>
                    {uploadedAt && (
                      <span className="text-[10px] text-slate-400">
                        {uploadedAt} · {report.uploadedByName}
                      </span>
                    )}
                    {isReceived ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Badge
                          variant="outline"
                          className="text-[10px] text-green-700 border-green-200 bg-green-50 gap-1 py-0 px-1.5 h-4"
                        >
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          Received
                        </Badge>
                        {receivedDate && (
                          <span className="text-[10px] text-slate-400">{receivedDate}</span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Badge
                          variant="outline"
                          className="text-[10px] text-amber-700 border-amber-200 bg-amber-50 gap-1 py-0 px-1.5 h-4"
                        >
                          <Clock className="h-2.5 w-2.5" />
                          Pending
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={report.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Download"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-400 hover:text-blue-600" />
                  </a>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                    disabled={deleting === report.id}
                    onClick={() => setConfirmDelete(report)}
                  >
                    {deleting === report.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload control */}
      <div className="ml-5">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.zip"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
        {uploading ? (
          <div className="flex items-center gap-2 text-xs text-slate-500 py-1">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
            <span>Uploading… {uploadProgress}%</span>
          </div>
        ) : pendingFile ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 min-w-0 flex-1 truncate">
              <FileText className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              <span className="truncate font-medium">{pendingFile.name}</span>
              <span className="text-slate-400 shrink-0">({(pendingFile.size / 1024).toFixed(0)} KB)</span>
            </div>
            <Button
              size="sm"
              className="h-7 text-xs gap-1 bg-blue-600 hover:bg-blue-700 text-white shrink-0"
              onClick={handleUpload}
            >
              <Upload className="h-3 w-3" />
              Upload
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-slate-400 hover:text-red-500 shrink-0"
              onClick={() => setPendingFile(null)}
              title="Cancel"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5 border-dashed"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-3 w-3" />
            Attach Service Report
          </Button>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-700">&ldquo;{confirmDelete?.fileName}&rdquo;</span>?
              This action cannot be undone and the file will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete) {
                  handleDelete(confirmDelete);
                  setConfirmDelete(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
