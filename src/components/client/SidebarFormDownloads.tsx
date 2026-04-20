"use client";

import { useState } from "react";
import { ref, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface FormFile {
  label: string;
  description: string;
  storagePath: string;
}

const FORM_FILES: FormFile[] = [
  {
    label: "Sample Submission Form",
    description: "PGCV-LF-SSF Rev. 001",
    storagePath: "forms/Sample_Submission_Form.pdf",
  },
  {
    label: "Sample Submission Requirements",
    description: "VSF-LR-SSR Rev. 006",
    storagePath: "forms/VSF-LR-SSR_Sample Submission Requirements and Form_v6.pdf",
  },
];

export default function SidebarFormDownloads() {
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const handleDownload = async (form: FormFile) => {
    setLoading((prev) => ({ ...prev, [form.storagePath]: true }));
    try {
      const url = await getDownloadURL(ref(storage, form.storagePath));
      // Open in new tab — browser will prompt download for PDFs
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.download = form.storagePath.split("/").pop() ?? "form.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      toast.error(`Failed to download "${form.label}". Please try again.`);
    } finally {
      setLoading((prev) => ({ ...prev, [form.storagePath]: false }));
    }
  };

  return (
    <div className="space-y-1.5">
      {FORM_FILES.map((form) => {
        const isLoading = !!loading[form.storagePath];
        return (
          <div
            key={form.storagePath}
            className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-white px-2.5 py-2 shadow-sm"
          >
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="h-3.5 w-3.5 flex-shrink-0 text-orange-500" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-700 leading-tight truncate">
                  {form.label}
                </p>
                <p className="text-[10px] text-slate-400 leading-tight truncate">
                  {form.description}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleDownload(form)}
              disabled={isLoading}
              className="flex-shrink-0 flex items-center gap-1 text-[10px] font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-full px-2 py-0.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={`Download ${form.label}`}
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Download className="h-3 w-3" />
              )}
              {isLoading ? "..." : "Download"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
