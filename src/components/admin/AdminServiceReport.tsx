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
import { toast } from "sonner";
import useAuth from "@/hooks/useAuth";
import { logActivity } from "@/services/activityLogService";
import { FileText, Loader2, Trash2, Upload, Download } from "lucide-react";
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
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_BYTES) {
      toast.error("File must be 20 MB or less.");
      return;
    }

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
    if (!confirm(`Delete "${report.fileName}"?`)) return;
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
                    onClick={() => handleDelete(report)}
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
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5 border-dashed"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-3 w-3" />
            Upload Service Report
          </Button>
        )}
      </div>
    </div>
  );
}
