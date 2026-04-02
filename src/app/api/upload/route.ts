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

function normalizeBucketName(raw: string): string {
  return raw.replace(/^gs:\/\//, "").trim();
}

async function resolveExistingBucket() {
  const initialBucket = getStorageBucket();
  if (!initialBucket) return null;

  const configured = [
    process.env.FIREBASE_STORAGE_BUCKET,
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    initialBucket.name,
  ]
    .filter((v): v is string => Boolean(v && v.trim()))
    .map((v) => normalizeBucketName(v));

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "";

  const candidates = Array.from(
    new Set([
      ...configured,
      projectId ? `${projectId}.appspot.com` : "",
      projectId ? `${projectId}.firebasestorage.app` : "",
      projectId ? `${projectId}-backups` : "",
    ].filter(Boolean)),
  );

  return {
    storage: initialBucket.storage,
    candidates,
  };
}

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

    const bucketInfo = await resolveExistingBucket();
    if (!bucketInfo) {
      return NextResponse.json(
        { error: "Storage bucket is not configured or does not exist on the server" },
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

    let usedBucketName: string | null = null;
    let lastError: unknown = null;

    for (const candidateName of bucketInfo.candidates) {
      try {
        const bucket = bucketInfo.storage.bucket(candidateName);
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
        usedBucketName = bucket.name;
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!usedBucketName) {
      throw lastError instanceof Error
        ? lastError
        : new Error("Unable to upload to any configured storage bucket");
    }

    let url: string;
    const isFirebaseBucket =
      usedBucketName.endsWith(".appspot.com") ||
      usedBucketName.endsWith(".firebasestorage.app");

    if (isFirebaseBucket) {
      // Stable Firebase Storage download URL.
      const encodedPath = encodeURIComponent(filePath);
      url = `https://firebasestorage.googleapis.com/v0/b/${usedBucketName}/o/${encodedPath}?alt=media&token=${downloadToken}`;
    } else {
      // Non-Firebase GCS bucket fallback (e.g. project backup bucket).
      // Use a long-lived signed URL so clients can download without extra auth.
      const fileRef = bucketInfo.storage.bucket(usedBucketName).file(filePath);
      const [signedUrl] = await fileRef.getSignedUrl({
        action: "read",
        expires: "01-01-2100",
      });
      url = signedUrl;
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error("[/api/upload] Upload error:", error);
    return NextResponse.json(
      { error: "File upload failed. Please try again." },
      { status: 500 }
    );
  }
}
