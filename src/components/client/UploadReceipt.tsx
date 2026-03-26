"use client";

import React, { useState } from "react";
import { uploadFile, validateFile } from "@/lib/fileUpload";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import useAuth from "@/hooks/useAuth";

export default function UploadReceipt({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return toast.error("Select a file first");

    try {
      validateFile(file, 10, ["application/pdf", "image/png", "image/jpeg"]);
    } catch (err: any) {
      return toast.error(err?.message || "Invalid file");
    }

    setUploading(true);
    try {
      const folder = `receipts/${projectId}`;
      const downloadURL = await uploadFile(file, folder);

      // Save metadata to Firestore under projects/{projectId}/officialReceipts
      const receiptsCol = collection(db, "projects", projectId, "officialReceipts");
      await addDoc(receiptsCol, {
        fileName: file.name,
        contentType: file.type,
        size: file.size,
        downloadURL,
        uploadedBy: user?.email || "anonymous",
        uploadedAt: serverTimestamp(),
      });

      toast.success("Receipt uploaded");
      setFile(null);
    } catch (error) {
      console.error("Upload failed", error);
      toast.error("Upload failed. See console for details.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mt-2 ml-5">
      <div className="flex items-center gap-2">
        <input
          id={`receipt-upload-${projectId}`}
          type="file"
          accept=".pdf,image/*"
          onChange={handleFileChange}
          className="text-xs"
        />
        <Button size="sm" onClick={handleUpload} disabled={!file || uploading}>
          {uploading ? "Uploading…" : "Upload Receipt"}
        </Button>
      </div>
      {file && <div className="text-xs text-slate-500 mt-1">Selected: {file.name}</div>}
    </div>
  );
}
