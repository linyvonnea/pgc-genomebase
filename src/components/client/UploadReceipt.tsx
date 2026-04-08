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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import useAuth from "@/hooks/useAuth";
import { logActivity } from "@/services/activityLogService";
import {
  FileText,
  Trash2,
  Loader2,
  Paperclip,
  X,
  Upload,
  Lock,
  CheckCircle2,
  RotateCcw,
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
  orNumber?: string;
  orDate?: string;
  acknowledgedByAdmin?: boolean;
  returnedByAdmin?: boolean;
  chargeSlipNumber?: string;
}

interface UploadReceiptProps {
  projectId: string;
  hasChargeSlip: boolean;
  /** When provided, only show/upload receipts for this specific charge slip */
  chargeSlipNumber?: string;
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

export default function UploadReceipt({ projectId, hasChargeSlip, chargeSlipNumber: csNum }: UploadReceiptProps) {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(true);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [orNumber, setOrNumber] = useState("");
  const [orDate, setOrDate] = useState("");
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

  // Locked if any receipt is awaiting admin action (not yet acknowledged and not returned)
  const hasPendingReceipt = visibleReceipts.some((r) => !r.acknowledgedByAdmin && !r.returnedByAdmin);
  const verifiedCount = visibleReceipts.filter((r) => r.acknowledgedByAdmin).length;
  const MAX_RECEIPTS = 3;

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
    setOrNumber("");
    setOrDate("");
  };

  const handleCancelPending = () => {
    setPendingFile(null);
    setOrNumber("");
    setOrDate("");
  };

  const handleUpload = async () => {
    if (!pendingFile) return;
    if (!orNumber.trim()) {
      toast.error("Please enter the OR Number before uploading.");
      return;
    }
    if (!orDate) {
      toast.error("Please select the OR Date before uploading.");
      return;
    }
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
        orNumber: orNumber.trim(),
        orDate,
        acknowledgedByAdmin: false,
        returnedByAdmin: false,
        ...(csNum && { chargeSlipNumber: csNum }),
      });
      await logActivity({
        userId: user?.email || "anonymous",
        userEmail: user?.email || "anonymous",
        userName: user?.displayName || "Client",
        action: "CREATE",
        entityType: "project",
        entityId: projectId,
        description: `Uploaded official receipt: ${pendingFile.name} (OR No. ${orNumber.trim()})`,
      });
      toast.success("Receipt uploaded successfully. Awaiting admin acknowledgment.");
      setPendingFile(null);
      setOrNumber("");
      setOrDate("");
    } catch (err) {
      console.error("Upload failed:", err);
      toast.error(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (receipt: Receipt) => {
    // Block delete if acknowledged by admin (permanent lock)
    if (receipt.acknowledgedByAdmin) {
      toast.error("This receipt has been acknowledged by the admin and cannot be deleted.");
      return;
    }
    // Block delete if still pending admin action (not returned yet)
    if (!receipt.returnedByAdmin) {
      toast.error("This receipt is pending admin review and cannot be deleted yet.");
      return;
    }
    setDeletingId(receipt.id);
    try {
      await deleteDoc(doc(db, "projects", projectId, "officialReceipts", receipt.id));
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
      ) : visibleReceipts.length === 0 ? (
        <p className="text-xs text-slate-400 ml-5">No receipts uploaded yet</p>
      ) : (
        <div className="space-y-1.5 ml-5">
          {/* Receipt count progress */}
          <p className="text-[9px] text-slate-400">
            {verifiedCount} of {visibleReceipts.length} receipt{visibleReceipts.length !== 1 ? "s" : ""} verified
            {visibleReceipts.length >= MAX_RECEIPTS ? " · Maximum reached" : ` · ${MAX_RECEIPTS - visibleReceipts.length} remaining`}
          </p>
          {visibleReceipts.map((receipt) => {
            const isVerified = receipt.acknowledgedByAdmin;
            const isReturned = receipt.returnedByAdmin && !receipt.acknowledgedByAdmin;
            const isPending = !receipt.acknowledgedByAdmin && !receipt.returnedByAdmin;

            return (
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
                        {[
                          receipt.orNumber ? `OR No. ${receipt.orNumber}` : null,
                          receipt.orDate,
                          formatFileSize(receipt.size),
                          formatDate(receipt.uploadedAt),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </a>
                  ) : (
                    <div>
                      <p className="text-[11px] font-semibold text-slate-700 truncate leading-tight">
                        {receipt.fileName || receipt.id}
                      </p>
                      <p className="text-[9px] text-slate-400 leading-tight mt-0.5">
                        {[
                          receipt.orNumber ? `OR No. ${receipt.orNumber}` : null,
                          receipt.orDate,
                          formatFileSize(receipt.size),
                          formatDate(receipt.uploadedAt),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Status badge */}
                  {isVerified && (
                    <span
                      className="flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5"
                      title="Acknowledged by admin"
                    >
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      Verified
                    </span>
                  )}
                  {isPending && (
                    <span
                      className="text-[9px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 font-semibold"
                      title="Waiting for admin acknowledgment"
                    >
                      Pending
                    </span>
                  )}
                  {isReturned && (
                    <span
                      className="flex items-center gap-0.5 text-[9px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5"
                      title="Admin returned this receipt for correction"
                    >
                      <RotateCcw className="h-2.5 w-2.5" />
                      Returned
                    </span>
                  )}

                  {/* Action icon */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    {isVerified && (
                      <span title="Cannot delete — acknowledged by admin">
                        <Lock className="h-3 w-3 text-slate-300" />
                      </span>
                    )}
                    {isPending && (
                      <span title="Cannot delete — awaiting admin review">
                        <Lock className="h-3 w-3 text-amber-300" />
                      </span>
                    )}
                    {isReturned && (
                      <button
                        type="button"
                        disabled={deletingId === receipt.id}
                        onClick={() => handleDelete(receipt)}
                        className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        title="Remove returned receipt and re-upload"
                      >
                        {deletingId === receipt.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pending file + OR details form ── */}
      {pendingFile && (
        <div className="ml-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 space-y-3">
          {/* File preview */}
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-slate-700 truncate">{pendingFile.name}</p>
              <p className="text-[9px] text-slate-400">{formatFileSize(pendingFile.size)}</p>
            </div>
            <button
              type="button"
              onClick={handleCancelPending}
              className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-emerald-100 transition-colors"
              title="Cancel"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          {/* OR Number & Date */}
          <div className="flex flex-col gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">
                OR Number <span className="text-red-500">*</span>
              </Label>
              <Input
                value={orNumber}
                onChange={(e) => {
                  // Only allow digits
                  const val = e.target.value.replace(/\D/g, "");
                  setOrNumber(val);
                }}
                inputMode="numeric"
                placeholder="e.g. 0012345"
                className="h-8 text-xs w-full"
                maxLength={20}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">
                OR Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={orDate}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => setOrDate(e.target.value)}
                className="h-8 text-xs w-full"
              />
            </div>
          </div>

          <Button
            size="sm"
            disabled={uploading || !orNumber.trim() || !orDate}
            onClick={handleUpload}
            className="w-full h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
          >
            {uploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Upload className="h-3 w-3" />
            )}
            {uploading ? "Uploading…" : "Upload Receipt"}
          </Button>
        </div>
      )}

      {/* ── Attach button — shown when under 3 receipts and no receipt is pending ── */}
      {!pendingFile && visibleReceipts.length < MAX_RECEIPTS && !hasPendingReceipt && (
        <div className="ml-5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading || !hasChargeSlip}
          />
          <button
            type="button"
            disabled={uploading || !hasChargeSlip}
            onClick={() => fileInputRef.current?.click()}
            title={!hasChargeSlip ? "A Charge Slip must be issued first before attaching a receipt." : "Attach an official receipt"}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium border border-dashed rounded-lg px-2.5 py-1.5 transition-colors
              disabled:cursor-not-allowed disabled:opacity-50 disabled:border-slate-200 disabled:text-slate-400 disabled:bg-white
              enabled:text-slate-500 enabled:hover:text-emerald-700 enabled:border-slate-200 enabled:hover:border-emerald-300 enabled:bg-white enabled:hover:bg-emerald-50"
          >
            <Paperclip className="h-3 w-3" />
            {csNum ? "Upload Official Receipt" : "Attach receipt"}
          </button>
          {!hasChargeSlip && (
            <p className="text-[9px] text-slate-400 mt-1">
              A Charge Slip must be issued first.
            </p>
          )}
        </div>
      )}

      {/* Lock messages when a receipt exists but no pending file is being composed */}
      {!pendingFile && (visibleReceipts.length >= MAX_RECEIPTS || hasPendingReceipt) && (() => {
        const allVerified = visibleReceipts.length > 0 && visibleReceipts.every((r) => r.acknowledgedByAdmin);
        const hasVerified = visibleReceipts.some((r) => r.acknowledgedByAdmin);
        if (allVerified) {
          return (
            <div className="ml-5 flex items-center gap-1.5 text-[10px] text-emerald-600">
              <Lock className="h-3 w-3" />
              All receipts verified. No further uploads are required.
            </div>
          );
        }
        if (hasPendingReceipt) {
          return (
            <div className="ml-5 flex items-center gap-1.5 text-[10px] text-amber-600">
              <Lock className="h-3 w-3" />
              Receipt attachment locked — awaiting admin acknowledgment.
            </div>
          );
        }
        if (visibleReceipts.length >= MAX_RECEIPTS) {
          return (
            <div className="ml-5 flex items-center gap-1.5 text-[10px] text-slate-500">
              <Lock className="h-3 w-3" />
              Maximum of {MAX_RECEIPTS} receipts reached.
            </div>
          );
        }
        return null;
      })()}
    </div>
  );
}
