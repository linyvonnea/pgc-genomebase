// Types for the Member Approval workflow
// Draft members are stored in `memberApprovals` collection until approved by an admin.

import { ClientFormData } from "@/schemas/clientSchema";

export interface DraftMember {
  tempId: string;
  isPrimary: boolean;
  isValidated: boolean;
  formData: ClientFormData;
}

export type ApprovalStatus = "draft" | "pending" | "approved" | "rejected";

export interface MemberApproval {
  id?: string; // Firestore doc ID (auto or composite)
  inquiryId: string;
  projectPid: string;
  projectTitle: string;
  submittedBy: string; // Email of submitter
  submittedByName: string;
  submittedAt?: Date | string;
  status: ApprovalStatus;
  reviewedBy?: string; // Admin email
  reviewedByName?: string;
  reviewedAt?: Date | string;
  reviewNotes?: string;
  members: DraftMember[];
  createdAt: Date | string;
  updatedAt?: Date | string;
}
