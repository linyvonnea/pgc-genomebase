"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { doc, setDoc, Timestamp } from "firebase/firestore";

interface ClientConformeModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  clientName: string;
  designation: string;
  affiliation: string;
  projectTitle?: string;
  fundingAgency?: string;
  // Required for creating the conforme record
  inquiryId: string;
  clientEmail: string;
  projectPid?: string;
  projectRequestId?: string;
}

export default function ClientConformeModal({
  open,
  onConfirm,
  onCancel,
  loading = false,
  clientName,
  designation,
  affiliation,
  projectTitle,
  fundingAgency,
  inquiryId,
  clientEmail,
  projectPid,
  projectRequestId,
}: ClientConformeModalProps) {
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);

  const today = new Date().toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const filled = (value: string | undefined, fallback = "_______________") =>
    value && value.trim() ? value.trim() : fallback;

  const handleConfirm = async () => {
    if (!agreed) return;

    setSaving(true);
    try {
      if (!inquiryId || !clientEmail) {
        toast.error("Missing required information. Please reload the page and try again.");
        return;
      }

      const filled = (v: string | undefined) => (v && v.trim() ? v.trim() : "N/A");
      const now = new Date();
      const ts = Timestamp.fromDate(now);

      // Best Practice: Reuse the same document if the user re-agrees in the same session
      // This avoids generating multiple documents for the same submission attempt.
      const savedConformeId = localStorage.getItem('currentConformeId');
      const conformeId = (savedConformeId && savedConformeId.startsWith(`${inquiryId}_`))
        ? savedConformeId
        : `${inquiryId}_${now.getTime()}`;

      // Save with 'agreed_pending' status - user has read and agreed but not yet completed submission
      await setDoc(doc(db, "clientConformes", conformeId), {
        data: {
          documentVersion: "PGCV-LF-CC-v005",
          clientName:      filled(clientName),
          designation:     filled(designation),
          affiliation:     filled(affiliation),
          projectTitle:    filled(projectTitle),
          fundingAgency:   filled(fundingAgency),
          inquiryId,
          projectPid:        projectPid    ?? null,
          projectRequestId:  projectRequestId ?? null,
          createdBy:       clientEmail,
          clientIpAddress: "client_browser",
          userAgent:       typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
          agreementDate:   ts,
          createdAt:       ts, // This will be updated if they re-sign, which is technically correct (most recent agreement)
          status:          "agreed_pending", // User agreed but hasn't completed submission yet
          conformeId:      conformeId, 
          clientSignature: {
            method:    "typed_name",
            data:      filled(clientName),
            timestamp: ts,
          },
          programDirectorSignature: {
            method:    "auto_approved",
            data:      "VICTOR MARCO EMMANUEL N. FERRIOLS, Ph.D.",
            signedBy:  "vferriols@pgc.up.edu.ph",
            timestamp: ts,
          },
        },
      }, { merge: true }); // Use merge: true to preserve any fields if somehow already existing

      console.log("✅ Client Conforme recorded with 'agreed_pending' status:", conformeId);
      toast.success("Legal agreement recorded. Proceeding to final review...", { duration: 3000 });
      setAgreed(false);
      
      // Pass the conformeId to the parent for status tracking
      localStorage.setItem('currentConformeId', conformeId);
      onConfirm();
    } catch (error: unknown) {
      console.error("❌ Error saving Client Conforme:", error);
      const msg =
        error instanceof Error ? error.message : String(error);
      if (msg.includes("permission") || msg.includes("PERMISSION_DENIED")) {
        toast.error(
          "Permission denied. Please ask admin to update Firestore rules for clientConformes collection."
        );
      } else {
        toast.error("Failed to record agreement. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setAgreed(false);
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleCancel()}>
      <DialogContent className="max-w-4xl w-full flex flex-col h-[90vh] max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-slate-200 shrink-0">
          {/* Progress Indicator */}
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="default" className="bg-[#166FB5] text-white flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Step 1 of 3
            </Badge>
            <span className="text-xs text-slate-500">Legal Agreement Required</span>
          </div>
          
          <DialogTitle className="text-lg font-bold text-slate-800">
            Legal Agreement Required
          </DialogTitle>
          <div className="space-y-2">
            <p className="text-sm text-slate-600">
              Before submission, you must review and agree to our client terms and conditions.
            </p>
            <p className="text-xs text-slate-500 bg-blue-50 border border-blue-200 rounded-md p-2">
              📋 <strong>Next:</strong> After agreeing, you'll review your submission details before final approval.
            </p>
          </div>
        </DialogHeader>

        {/* Scrollable document body */}
        <ScrollArea className="flex-1 min-h-0 w-full">
          <div className="px-8 py-12 text-sm text-slate-700 leading-relaxed font-serif max-w-3xl mx-auto">
            {/* Header */}
            <div className="text-center space-y-2 mb-12">
              <h2 className="font-bold text-2xl text-slate-900 tracking-wide">
                CLIENT CONFORME
              </h2>
              <div className="text-slate-900 uppercase font-semibold tracking-wider text-sm">
                Philippine Genome Center Visayas
              </div>
              <p className="text-xs text-slate-500 font-sans tracking-widest pt-2">
                PGCV-LF-CC-V005
              </p>
            </div>

            {/* Autofilled Fields Grid */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 shadow-sm space-y-8">
              <div className="grid gap-8">
                <div className="space-y-1">
                   <label className="text-xs uppercase text-slate-500 font-semibold tracking-wider block">Client Name</label>
                   <div className="font-medium text-lg text-slate-900 border-b border-slate-300 pb-2">
                      {filled(clientName)}
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-1">
                      <label className="text-xs uppercase text-slate-500 font-semibold tracking-wider block">Designation</label>
                      <div className="font-medium text-slate-900 border-b border-slate-300 pb-2">
                        {filled(designation)}
                      </div>
                   </div>
                   <div className="space-y-1">
                      <label className="text-xs uppercase text-slate-500 font-semibold tracking-wider block">Affiliation</label>
                      <div className="font-medium text-slate-900 border-b border-slate-300 pb-2">
                        {filled(affiliation)}
                      </div>
                   </div>
                </div>

                <div className="space-y-1">
                   <label className="text-xs uppercase text-slate-500 font-semibold tracking-wider block">Project Title</label>
                   <div className="font-medium text-slate-900 border-b border-slate-300 pb-2 italic">
                      {filled(projectTitle)}
                   </div>
                </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-1">
                      <label className="text-xs uppercase text-slate-500 font-semibold tracking-wider block">Funding Institution</label>
                      <div className="font-medium text-slate-900 border-b border-slate-300 pb-2">
                        {filled(fundingAgency)}
                      </div>
                   </div>
                   <div className="space-y-1">
                      <label className="text-xs uppercase text-slate-500 font-semibold tracking-wider block">Date</label>
                      <div className="font-medium text-slate-900 border-b border-slate-300 pb-2">
                        {today}
                      </div>
                   </div>
                </div>
              </div>
            </div>
            
            <p className="text-center text-xs text-slate-400 mt-12 font-sans">
              By clicking "I Agree & Continue", you acknowledge the terms of this engagement.
            </p>
          </div>
        </ScrollArea>

        {/* Footer: agree checkbox + buttons */}
        <div className="shrink-0 border-t border-slate-200 px-6 py-4 bg-slate-50 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer group p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
            <Checkbox
              id="conforme-agree"
              checked={agreed}
              onCheckedChange={(v) => setAgreed(v === true)}
              className="mt-0.5 shrink-0"
            />
            <div className="space-y-1">
              <span className="text-sm text-slate-700 group-hover:text-slate-900 transition-colors font-medium">
                ✓ I have read and understood the Client Conforme agreement
              </span>
              <p className="text-xs text-slate-500">
                I agree to the terms and conditions outlined in this legal document (PGCV-LF-CC-v005).
              </p>
            </div>
          </label>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!agreed || loading || saving}
              className="px-6 bg-gradient-to-r from-[#166FB5] to-[#4038AF] hover:from-[#166FB5]/90 hover:to-[#4038AF]/90 text-white font-semibold disabled:opacity-50"
            >
              {(loading || saving) ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {saving ? "Recording Agreement…" : "Processing…"}
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  I Agree & Continue
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
