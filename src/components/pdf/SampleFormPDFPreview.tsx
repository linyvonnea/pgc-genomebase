"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { SampleFormRecord } from "@/types/SampleForm";
import { getSampleFormById } from "@/services/sampleFormService";
import { Loader2, AlertCircle } from "lucide-react";

// Dynamically import PDF components to avoid SSR issues
const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div> }
);

const SampleFormPDF = dynamic(
  () => import("./SampleFormPDF").then((mod) => mod.SampleFormPDF),
  { ssr: false }
);

interface Props {
  id: string;
}

export default function SampleFormPDFPreview({ id }: Props) {
  const [record, setRecord] = useState<SampleFormRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecord() {
      if (!id) return;
      
      try {
        setLoading(true);
        setError(null);
        const data = await getSampleFormById(id);
        if (data) {
          setRecord(data);
        } else {
          setError("Sample form not found.");
        }
      } catch (err: any) {
        console.error("Error fetching sample form:", err);
        setError("Failed to load sample form data.");
      } finally {
        setLoading(false);
      }
    }

    fetchRecord();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] w-full bg-white rounded-lg border border-slate-200">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
        <p className="text-slate-500 font-medium text-sm">Preparing document preview...</p>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="flex items-center justify-center h-[600px] w-full p-6 text-red-500 bg-red-50 rounded-lg border border-red-200">
        <div className="text-center">
          <AlertCircle className="h-10 w-10 mx-auto mb-2" />
          <h3 className="font-bold">Error</h3>
          <p>{error || "An unexpected error occurred while loading the document."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[600px] bg-slate-800 rounded-lg overflow-hidden shadow-inner border border-slate-700">
      <PDFViewer width="100%" height="100%" showToolbar={true} className="border-none">
        <SampleFormPDF record={record} />
      </PDFViewer>
    </div>
  );
}
