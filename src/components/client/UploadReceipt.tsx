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

    if (!f) return;

    try {
      validateFile(f, 10, ["application/pdf", "image/png", "image/jpeg"]);
    } catch (err: any) {
      toast.error(err?.message || "Invalid file");
      return;
    }

    setUploading(true);
    try {
      const folder = `receipts/${projectId}`;
      const downloadURL = await uploadFile(f, folder);

      // Save metadata to Firestore under projects/{projectId}/officialReceipts
      const receiptsCol = collection(db, "projects", projectId, "officialReceipts");
      await addDoc(receiptsCol, {
        fileName: f.name,
        contentType: f.type,
        size: f.size,
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
          disabled={uploading}
        />
        <div className="text-xs text-slate-500">
          {uploading ? "Uploading…" : file ? `Selected: ${file.name}` : "No file selected"}
        </div>
      </div>
    </div>
  );
}
