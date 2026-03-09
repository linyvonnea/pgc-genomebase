import { storage } from "./firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";

/**
 * Upload a file to Firebase Storage
 * @param file - The file to upload
 * @param folder - The folder to upload to (e.g., 'methodology-files')
 * @returns Promise<string> - The download URL of the uploaded file
 */
export async function uploadFile(file: File, folder: string = 'uploads'): Promise<string> {
  try {
    console.log('[File Upload] Starting upload:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      folder: folder
    });

    // Generate a unique filename to avoid conflicts
    const fileExtension = file.name.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;
    
    console.log('[File Upload] Generated unique filename:', uniqueFileName);
    
    // Create a reference to the file location
    const fileRef = ref(storage, `${folder}/${uniqueFileName}`);
    
    console.log('[File Upload] Uploading to Firebase Storage...');
    
    // Upload the file
    const snapshot = await uploadBytes(fileRef, file);
    
    console.log('[File Upload] Upload successful, getting download URL...');
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    console.log('[File Upload] Download URL obtained:', downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error('[File Upload] Error uploading file:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('storage/unauthorized')) {
        throw new Error('Upload failed: Permission denied. Please check Firebase Storage rules.');
      } else if (error.message.includes('storage/canceled')) {
        throw new Error('Upload was cancelled.');
      } else if (error.message.includes('storage/quota-exceeded')) {
        throw new Error('Upload failed: Storage quota exceeded.');
      } else if (error.message.includes('network')) {
        throw new Error('Upload failed: Network error. Please check your connection.');
      } else {
        throw new Error(`Upload failed: ${error.message}`);
      }
    }
    
    throw new Error('Failed to upload file. Please try again.');
  }
}

/**
 * Validate file before upload
 * @param file - The file to validate
 * @param maxSizeMB - Maximum file size in MB (default: 10MB)
 * @param allowedTypes - Array of allowed MIME types
 * @returns boolean - true if valid, throws error if invalid
 */
export function validateFile(
  file: File, 
  maxSizeMB: number = 10, 
  allowedTypes: string[] = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
): boolean {
  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    throw new Error(`File size must be less than ${maxSizeMB}MB`);
  }
  
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Only PDF and Word documents are allowed');
  }
  
  return true;
}