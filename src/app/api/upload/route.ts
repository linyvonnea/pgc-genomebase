/**
 * POST /api/upload
 *
 * Server-side file upload that uses the Firebase Admin SDK to write directly
 * to Cloud Storage, bypassing client-facing Storage Security Rules.
 * This allows both client-portal users and admins to upload chat attachments
 * without needing permissive Storage rules.
 *
 * Body: multipart/form-data
 *   file   – the File blob
 *   folder – destination folder path (e.g. "chat-attachments/inquiryId")
 *
 * Response: { url: string } — a stable Firebase Storage download URL
 */

import { NextRequest, NextResponse } from "next/server";
import { getStorageBucket } from "@/lib/firebase-admin";
import { v4 as uuidv4 } from "uuid";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string | null) || "uploads";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File exceeds the 10 MB size limit" },
        { status: 413 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type "${file.type}" is not allowed` },
        { status: 415 }
      );
    }

    const bucket = getStorageBucket();
    if (!bucket) {
      return NextResponse.json(
        { error: "Storage not configured on the server" },
        { status: 500 }
      );
    }

    const ext = file.name.split(".").pop() || "bin";
    const uniqueName = `${uuidv4()}.${ext}`;
    const filePath = `${folder}/${uniqueName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    // Generate a Firebase-compatible download token so the resulting URL
    // looks and behaves exactly like one from getDownloadURL() on the client.
    const downloadToken = uuidv4();

    const fileRef = bucket.file(filePath);
    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
        metadata: {
          // This custom metadata key is what Firebase client SDK reads to
          // construct the download URL returned by getDownloadURL().
          firebaseStorageDownloadTokens: downloadToken,
        },
      },
    });

    // Construct the stable, non-expiring Firebase Storage download URL.
    const encodedPath = encodeURIComponent(filePath);
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${downloadToken}`;

    return NextResponse.json({ url });
  } catch (error) {
    console.error("[/api/upload] Upload error:", error);
    return NextResponse.json(
      { error: "File upload failed. Please try again." },
      { status: 500 }
    );
  }
}
