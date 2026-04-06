"use client";

import React, { useState, useEffect, useRef } from "react";
import { uploadFile } from "@/lib/fileUpload";
import { db, storage } from "@/lib/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  orderBy,
  query,
  deleteDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { ref as storageRef, deleteObject } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import useAuth from "@/hooks/useAuth";
import { logActivity } from "@/services/activityLogService";
import {
  FileText,
  Download,
  Trash2,
  Loader2,
  Paperclip,
  X,
  Upload,
} from "lucide-react";
import { format } from "date-fns";

interface Receipt {
  id: string;
  fileName?: string;
  contentType?: string;
  size?: number;
  downloadURL?: string;
  uploadedBy?: string;
  uploadedAt?: Timestamp;
}

function formatFileSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ts?: Timestamp) {
  if (!ts) return "";
  try {
    return format(ts.toDate(), "MMM d, yyyy");
  } catch {
    return "";
  }
}

/** Extract the Firebase Storage path from a download URL for deletion. */
function extractStoragePath(url: string): string | null {
  try {
    const match = url.match(/\/o\/(.+?)(?:\?|$)/);
    if (!match) return null;
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

export default function UploadReceipt({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(true);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!projectId || projectId === "DRAFT" || projectId.startsWith("PENDING-")) {
      setLoadingReceipts(false);
      return;
    }
    const q = query(
      collection(db, "projects", projectId, "officialReceipts"),
      orderBy("uploadedAt", "desc"),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setReceipts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Receipt)));
        setLoadingReceipts(false);
      },
      () => setLoadingReceipts(false),
    );
    return () => unsub();
  }, [projectId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 10 MB.");
      return;
    }
    if (f.type !== "application/pdf" && !f.type.startsWith("image/")) {
      toast.error("Only PDF and image files are allowed.");
      return;
    }
    setPendingFile(f);
  };

  const handleUpload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    try {
      const downloadURL = await uploadFile(pendingFile, `receipts/${projectId}`);
      await addDoc(collection(db, "projects", projectId, "officialReceipts"), {
        fileName: pendingFile.name,
        contentType: pendingFile.type,
        size: pendingFile.size,
        downloadURL,
        uploadedBy: user?.email || "anonymous",
        uploadedAt: serverTimestamp(),
      });
      await logActivity({
        userId: user?.email || "anonymous",
        userEmail: user?.email || "anonymous",
        userName: user?.displayName || "Client",
        action: "CREATE",
        entityType: "project",
        entityId: projectId,
        description: `Uploaded official receipt: ${pendingFile.name}`,
      });
      toast.success("Receipt uploaded successfully.");
      setPendingFile(null);
    } catch (err) {
      console.error("Upload failed:", err);
      toast.error(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (receipt: Receipt) => {
    setDeletingId(receipt.id);
    try {
      await deleteDoc(doc(db, "projects", projectId, "officialReceipts", receipt.id));
      // Best-effort storage deletion
      if (receipt.downloadURL) {
        const path = extractStoragePath(receipt.downloadURL);
        if (path) {
          try {
            await deleteObject(storageRef(storage, path));
          } catch {
            // Non-critical: file metadata already removed from Firestore
          }
        }
      }
      await logActivity({
        userId: user?.email || "anonymous",
        userEmail: user?.email || "anonymous",
        userName: user?.displayName || "Client",
        action: "DELETE",
        entityType: "project",
        entityId: projectId,
        description: `Deleted official receipt: ${receipt.fileName || receipt.id}`,
      });
      toast.success("Receipt removed.");
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error("Failed to remove receipt. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-2 mt-1">
      {/* ── Receipt list ── */}
      {loadingReceipts ? (
        <div className="flex items-center gap-1.5 py-1 text-[11px] text-slate-400 ml-5">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading receipts…
        </div>
      ) : receipts.length === 0 ? (
        <p className="text-xs text-slate-400 ml-5">No official receipts yet</p>
      ) : (
        <div className="space-y-1.5 ml-5">
          {receipts.map((receipt) => (
            <div
              key={receipt.id}
              className="group flex items-center gap-2 rounded-lg bg-white border border-slate-100 shadow-sm px-2.5 py-1.5 hover:border-blue-200 hover:bg-blue-50/10 transition-colors"
            >
              <FileText className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                {receipt.downloadURL ? (
                  <a
                    href={receipt.downloadURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block hover:underline"
                    title="View receipt"
                  >
                    <p className="text-[11px] font-semibold text-slate-700 truncate leading-tight">
                      {receipt.fileName || receipt.id}
                    </p>
                    <p className="text-[9px] text-slate-400 leading-tight mt-0.5">
                      {[formatFileSize(receipt.size), formatDate(receipt.uploadedAt)]
                        .filter(Boolean)
                        .join(" \u00b7 ")}
                    </p>
                  </a>
                ) : (
                  <div>
                    <p className="text-[11px] font-semibold text-slate-700 truncate leading-tight">
                      {receipt.fileName || receipt.id}
                    </p>
                    <p className="text-[9px] text-slate-400 leading-tight mt-0.5">
                      {[formatFileSize(receipt.size), formatDate(receipt.uploadedAt)]
                        .filter(Boolean)
                        .join(" \u00b7 ")}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  disabled={deletingId === receipt.id}
                  onClick={() => handleDelete(receipt)}
                  className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  title="Remove receipt"
                >
                  {deletingId === receipt.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Pending file preview ── */}
      {pendingFile && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 ml-5">
          <FileText className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-slate-700 truncate">{pendingFile.name}</p>
            <p className="text-[9px] text-slate-400">{formatFileSize(pendingFile.size)}</p>
          </div>
          <button
            type="button"
            onClick={() => setPendingFile(null)}
            className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-emerald-100 transition-colors"
            title="Cancel"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* ── Action row ── */}
      <div className="flex items-center gap-2 ml-5">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-emerald-700 border border-dashed border-slate-200 hover:border-emerald-300 rounded-lg px-2.5 py-1.5 bg-white hover:bg-emerald-50 transition-colors"
        >
          <Paperclip className="h-3 w-3" />
          {pendingFile ? "Change file" : "Attach receipt"}
        </button>
        {pendingFile && (
          <Button
            size="sm"
            disabled={uploading}
            onClick={handleUpload}
            className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white px-3 gap-1"
          >
            {uploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Upload className="h-3 w-3" />
            )}
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        )}
      </div>
    </div>
  );
}
