"use client";

import React, { useState } from "react";
import { uploadFile, validateFile } from "@/lib/fileUpload";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import useAuth from "@/hooks/useAuth";
import { logActivity } from "@/services/activityLogService";

export default function UploadReceipt({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);

    if (!f) return;

    try {
      validateFile(f, 10, ["application/pdf", "image/*"]);
    } catch (err: any) {
      setFile(null);
      toast.error(err?.message || "Invalid file");
    }
  };

  const handleUpload = async () => {
    if (!file) return toast.error("Select a file first");

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

      // Log the activity
      await logActivity({
        userId: user?.email || "anonymous",
        userEmail: user?.email || "anonymous",
        userName: user?.displayName || "Client",
        action: "CREATE",
        entityType: "project",
        entityId: projectId,
        description: `Uploaded official receipt: ${file.name}`,
      });

      toast.success("Receipt uploaded");
      setFile(null);
    } catch (error) {
      console.error("Upload failed", error);
      const message = error instanceof Error ? error.message : "Upload failed. Please try again.";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mt-2 ml-5 space-y-2">
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
      {file && !uploading && (
        <Button size="sm" onClick={handleUpload}>
          Upload Receipt
        </Button>
      )}
    </div>
  );
}
