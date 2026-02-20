// Types for Client Conforme legal document management

export interface ClientConformeData {
  // Document content at time of signing
  documentVersion: string; // "PGCV-LF-CC-v005"
  documentHash: string; // SHA-256 hash of the complete document content
  
  // Client information (as filled in the document)
  clientName: string;
  designation: string;
  affiliation: string;
  projectTitle: string;
  fundingAgency: string;
  
  // Project context
  inquiryId: string;
  projectPid?: string; // May not exist yet for draft projects
  projectRequestId?: string;
  
  // Agreement metadata
  agreementDate: Date | string; // When client clicked "I Agree"
  clientIpAddress: string;
  userAgent: string;
  browserFingerprint?: string; // Optional: for additional security
  
  // Digital signatures
  clientSignature?: {
    method: "typed_name" | "drawn_signature" | "e_signature";
    data: string; // Base64 signature image or typed name
    timestamp: Date | string;
  };
  
  programDirectorSignature?: {
    method: "auto_approved" | "manual_signature" | "e_signature";
    data: string;
    signedBy: string; // Email of the signing director
    timestamp: Date | string;
  };
  
  // System metadata
  createdAt: Date | string;
  createdBy: string; // Client email
  status: "signed" | "pending_director" | "completed";
}

export interface ClientConforme {
  id?: string; // Firestore doc ID
  // Composite of inquiryId + timestamp for uniqueness
  // Format: "{inquiryId}_{timestamp}"
  
  data: ClientConformeData;
}

// Service interface
export interface ClientConformeService {
  createConforme(data: ClientConformeData): Promise<string>;
  getConformesByInquiry(inquiryId: string): Promise<ClientConforme[]>;
  getConformeByProject(projectPid: string): Promise<ClientConforme | null>;
  addDirectorSignature(conformeId: string, signature: ClientConformeData["programDirectorSignature"]): Promise<void>;
}