"use client";

import { useEffect, useRef, useState } from "react";
import { ref, getDownloadURL, getBlob, uploadBytes, deleteObject } from "firebase/storage";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  where,
  deleteDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { storage, db } from "@/lib/firebase";
import {
  FileText,
  Download,
  Loader2,
  Upload,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import useAuth from "@/hooks/useAuth";
import { format } from "date-fns";

interface FormEntry {
  label: string;
  description: string;
  storagePath: string;
  formKey: string;
}

const PORTAL_FORMS: FormEntry[] = [
  {
    label: "Sample Submission Requirements",
    description: "VSF-LR-SSR Rev. 005 — Read before submitting samples",
    storagePath: "forms/VSF-LR-SSR_Sample Submission Requirements and Form_v6.pdf",
    formKey: "ssreq",
  },
  {
    label: "Sample Submission Form",
    description: "PGCV-LF-SSF Rev. 001 — Fill out and include with shipment",
    storagePath: "forms/Sample_Submission_Form.pdf",
    formKey: "ssf",
  },
];

interface TemplateState {
  url: string | null;
  loading: boolean;
  error: boolean;
}

interface SubmittedFile {
  id: string;
  fileName: string;
  downloadURL: string;
  storagePath: string;
  uploadedAt: Timestamp | null;
  acknowledgedByAdmin?: boolean;
}

interface DownloadFormsProps {
  projectId: string;
}

export default function DownloadForms({ projectId }: DownloadFormsProps) {
  const { user } = useAuth();
  const [templateStates, setTemplateStates] = useState<TemplateState[]>(
    PORTAL_FORMS.map(() => ({ url: null, loading: true, error: false }))
  );
  const [downloadingIdx, setDownloadingIdx] = useState<number | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [submittedFiles, setSubmittedFiles] = useState<Record<string, SubmittedFile[]>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Load template download URLs
  useEffect(() => {
    PORTAL_FORMS.forEach((form, i) => {
      getDownloadURL(ref(storage, form.storagePath))
        .then((url) =>
          setTemplateStates((prev) =>
            prev.map((s, idx) => (idx === i ? { url, loading: false, error: false } : s))
          )
        )
        .catch(() =>
          setTemplateStates((prev) =>
            prev.map((s, idx) => (idx === i ? { url: null, loading: false, error: true } : s))
          )
        );
    });
  }, []);

  // Realtime listener for uploaded submissions
  // No orderBy to avoid requiring a composite Firestore index — sorted client-side.
  useEffect(() => {
    if (!projectId) return;

    const q = query(
      collection(db, "clientFormSubmissions"),
      where("projectId", "==", projectId)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const grouped: Record<string, SubmittedFile[]> = {};
        snap.forEach((d) => {
          const data = d.data();
          const key = data.formKey as string;
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push({
            id: d.id,
            fileName: data.fileName,
            downloadURL: data.downloadURL,
            storagePath: data.storagePath,
            uploadedAt: data.uploadedAt ?? null,
            acknowledgedByAdmin: data.acknowledgedByAdmin ?? false,
          });
        });
        // Sort each group newest-first
        for (const key of Object.keys(grouped)) {
          grouped[key].sort((a, b) => (b.uploadedAt?.toMillis() ?? 0) - (a.uploadedAt?.toMillis() ?? 0));
        }
        setSubmittedFiles(grouped);
      },
      (error) => {
        console.error("DownloadForms: Firestore error", error);
      }
    );

    return () => unsub();
  }, [projectId]);

  const handleDownloadTemplate = async (form: FormEntry, index: number) => {
    try {
      setDownloadingIdx(index);
      const fileRef = ref(storage, form.storagePath);
      let blob: Blob;
      try {
        blob = await getBlob(fileRef);
      } catch {
        const url = await getDownloadURL(fileRef);
        const res = await fetch(url);
        if (!res.ok) throw new Error("Network error");
        blob = await res.blob();
      }
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = form.storagePath.split("/").pop() || "form.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      const url = templateStates[index].url;
      if (url) {
        window.open(url, "_blank");
        toast.info("Opening in new tab (direct download restricted)");
      } else {
        toast.error("Download failed. Please try viewing the file instead.");
      }
    } finally {
      setDownloadingIdx(null);
    }
  };

  const handleUpload = async (form: FormEntry, file: File) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are accepted.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File must be under 20 MB.");
      return;
    }

    try {
      setUploadingKey(form.formKey);

      const ext = file.name.split(".").pop() || "pdf";
      const timestamp = Date.now();
      const uniqueName = `${form.formKey}-${timestamp}-${uuidv4()}.${ext}`;
      const storagePath = `client-form-submissions/${projectId}/${uniqueName}`;
      const fileRef = ref(storage, storagePath);
      await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);

      await addDoc(collection(db, "clientFormSubmissions"), {
        projectId,
        formKey: form.formKey,
        formLabel: form.label,
        fileName: file.name,
        storagePath,
        downloadURL,
        uploadedAt: serverTimestamp(),
        uploadedBy: user?.email ?? "client",
        acknowledgedByAdmin: false,
      });

      toast.success(`"${file.name}" uploaded successfully.`);
    } catch (err) {
      console.error("Upload failed:", err);
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploadingKey(null);
      // Reset the file input
      const input = fileInputRefs.current[form.formKey];
      if (input) input.value = "";
    }
  };

  const handleDelete = async (fileId: string, storagePath: string, fileName: string) => {
    try {
      await deleteDoc(doc(db, "clientFormSubmissions", fileId));
      try {
        await deleteObject(ref(storage, storagePath));
      } catch {
        // Storage file may already be gone — ignore
      }
      toast.success(`"${fileName}" removed.`);
    } catch {
      toast.error("Could not remove the file. Please try again.");
    }
  };

  return (
    <div className="ml-5 mb-2 space-y-3">
      {PORTAL_FORMS.map((form, i) => {
        const { url, loading, error } = templateStates[i];
        const isDownloading = downloadingIdx === i;
        const isUploading = uploadingKey === form.formKey;
        const uploaded = submittedFiles[form.formKey] ?? [];
        // Hide upload button if any file is still pending admin acknowledgement
        const hasPendingUpload = uploaded.some((f) => !f.acknowledgedByAdmin);

        return (
          <div key={form.formKey} className="rounded-lg border border-slate-100 bg-slate-50 overflow-hidden">
            {/* Clickable header row — click anywhere (except download btn) to toggle upload panel */}
            <div className="w-full flex items-start gap-2 px-3 py-2">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-medium leading-snug ${url ? "text-slate-700" : "text-slate-400"}`}>
                  {form.label}
                </p>
                <p className="text-[10px] text-slate-400 leading-snug">{form.description}</p>
              </div>

              <div className="flex items-center gap-1.5 mt-0.5 shrink-0">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                ) : error ? (
                  <span className="text-[10px] text-red-400">Unavailable</span>
                ) : (
                  <a
                    href={url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => { if (!url) e.preventDefault(); e.stopPropagation(); }}
                    className="text-[#166FB5] hover:text-[#0e4f8a] transition-colors"
                    title="Download template PDF"
                  >
                    {isDownloading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </a>
                )}
              </div>
            </div>

            {/* Upload panel */}
            <div className="border-t border-slate-100 px-3 py-2.5 bg-white/60 space-y-2">
                {/* Uploaded files listed ABOVE the upload button */}
                {uploaded.length > 0 && (
                  <div className="space-y-1">
                    {uploaded.map((f) => (
                      <div key={f.id} className="flex items-center gap-1.5 rounded-md bg-slate-50 border border-slate-100 px-2 py-1">
                        {f.acknowledgedByAdmin ? (
                          <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                        ) : (
                          <Clock className="h-3 w-3 shrink-0 text-amber-400" />
                        )}
                        {/* Clickable filename */}
                        <a
                          href={f.downloadURL}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[11px] font-medium text-[#166FB5] hover:underline truncate flex-1 min-w-0"
                          title={`View ${f.fileName}`}
                        >
                          {f.fileName}
                        </a>
                        {f.acknowledgedByAdmin ? (
                          <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5 shrink-0">
                            Acknowledged
                          </span>
                        ) : (
                          <span className="text-[9px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5 shrink-0">
                            Pending
                          </span>
                        )}
                        {f.uploadedAt && (
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {format(f.uploadedAt.toDate(), "MMM d")}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload button — hidden while a pending (unacknowledged) file exists, and hidden for read-only forms */}
                {!hasPendingUpload && form.formKey !== "ssreq" && (
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    ref={(el) => { fileInputRefs.current[form.formKey] = el; }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleUpload(form, file);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRefs.current[form.formKey]?.click();
                    }}
                    disabled={isUploading}
                    className="flex items-center gap-1.5 text-[11px] font-medium text-white bg-[#166FB5] hover:bg-[#0e4f8a] rounded-full px-2.5 py-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    {isUploading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Upload className="h-3 w-3" />
                    )}
                    {isUploading ? "Uploading…" : "Upload PDF"}
                  </button>
                </div>
                )}
              </div>
          </div>
        );
      })}
    </div>
  );
}
