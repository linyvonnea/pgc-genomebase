"use client";

import { useEffect, useState } from "react";
import { ref, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { FileText, Download, Loader2 } from "lucide-react";

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

  return (
    <div className="ml-5 mb-2 space-y-2">
      {PORTAL_FORMS.map((form, i) => {
        const { url, loading, error } = states[i];
        return (
          <div
            key={form.storagePath}
            className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
          >
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-700 leading-snug">{form.label}</p>
              <p className="text-[10px] text-slate-400 leading-snug">{form.description}</p>
            </div>
            {loading ? (
              <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-slate-400" />
            ) : error ? (
              <span className="text-[10px] text-red-400 mt-0.5">Unavailable</span>
            ) : (
              <a
                href={url!}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="mt-0.5 text-[#166FB5] hover:text-[#0e4f8a] transition-colors"
                title="Download PDF"
              >
                <Download className="h-4 w-4 shrink-0" />
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}
