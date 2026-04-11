"use client";

import { useEffect, useState } from "react";
import { ref, getDownloadURL, getBlob } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { FileText, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface FormEntry {
  label: string;
  description: string;
  storagePath: string;
}

const PORTAL_FORMS: FormEntry[] = [
  {
    label: "Sample Submission Requirements",
    description: "VSF-LR-SSR Rev. 005 — Read before submitting samples",
    storagePath:
      "forms/VSF-LR-SSR_Sample Submission Requirements and Form_v6.pdf",
  },
  {
    label: "Sample Submission Form",
    description: "PGCV-LF-SSF Rev. 001 — Fill out and include with shipment",
    storagePath: "forms/Sample_Submission_Form.pdf",
  },
];

interface FormState {
  url: string | null;
  loading: boolean;
  error: boolean;
}

export default function DownloadForms() {
  const [states, setStates] = useState<FormState[]>(
    PORTAL_FORMS.map(() => ({ url: null, loading: true, error: false }))
  );
  const [downloadingIdx, setDownloadingIdx] = useState<number | null>(null);

  useEffect(() => {
    PORTAL_FORMS.forEach((form, i) => {
      getDownloadURL(ref(storage, form.storagePath))
        .then((url) =>
          setStates((prev) =>
            prev.map((s, idx) => (idx === i ? { url, loading: false, error: false } : s))
          )
        )
        .catch(() =>
          setStates((prev) =>
            prev.map((s, idx) => (idx === i ? { url: null, loading: false, error: true } : s))
          )
        );
    });
  }, []);

  const handleDownload = async (storagePath: string, filename: string, index: number) => {
    try {
      setDownloadingIdx(index);
      
      const fileRef = ref(storage, storagePath);
      let blob: Blob;

      try {
        // Primary method: Official Firebase getBlob
        blob = await getBlob(fileRef);
      } catch (firebaseErr: any) {
        console.warn("Firebase getBlob failed, trying manual fetch:", firebaseErr);
        // Fallback: Fetch via signed URL (requires CORS)
        const downloadUrl = await getDownloadURL(fileRef);
        const response = await fetch(downloadUrl);
        if (!response.ok) throw new Error("Network response was not ok");
        blob = await response.blob();
      }

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      console.error("All download methods failed:", err);
      
      // Final fallback: Just open in new tab
      if (states[index].url) {
        window.open(states[index].url!, "_blank");
        toast.info("Opening file in new tab (Direct download restricted)");
      } else {
        toast.error("Download failed. Please try viewing the file instead.");
      }
    } finally {
      setDownloadingIdx(null);
    }
  };

  return (
    <div className="ml-5 mb-2 space-y-2">
      {PORTAL_FORMS.map((form, i) => {
        const { url, loading, error } = states[i];
        const isDownloading = downloadingIdx === i;

        return (
          <div
            key={form.storagePath}
            className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
          >
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
            <div className="min-w-0 flex-1">
              <a
                href={url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (!url) e.preventDefault();
                  e.stopPropagation();
                }}
                className={`text-xs font-medium leading-snug ${
                  url
                    ? "text-slate-700 hover:text-[#166FB5] hover:underline transition-colors"
                    : "text-slate-400"
                }`}
              >
                {form.label}
              </a>
              <p className="text-[10px] text-slate-400 leading-snug">{form.description}</p>
            </div>
            {loading ? (
              <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-slate-400" />
            ) : error ? (
              <span className="text-[10px] text-red-400 mt-0.5">Unavailable</span>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(form.storagePath, form.storagePath.split("/").pop() || "form.pdf", i);
                }}
                disabled={isDownloading}
                className="mt-0.5 text-[#166FB5] hover:text-[#0e4f8a] transition-colors disabled:opacity-50"
                title="Download PDF"
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 shrink-0" />
                )}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
