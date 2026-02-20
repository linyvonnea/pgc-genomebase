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
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import DownloadConformeButton from "@/components/pdf/DownloadConformeButton";
import { ClientConforme } from "@/types/ClientConforme";

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
  const [savedRecord, setSavedRecord] = useState<ClientConforme | null>(null);

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

      // 1. Get IP Info (for the audit trail)
      let ipAddress = "127.0.0.1";
      try {
        const ipRes = await fetch("/api/client-conforme");
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          ipAddress = ipData.ip;
        }
      } catch (e) {
        console.error("Failed to fetch IP info:", e);
      }

      const now = new Date();
      const conformeId = `${inquiryId}_${now.getTime()}`;

      const conformeRecord: ClientConforme = {
        id: conformeId,
        data: {
          documentVersion: "PGCV-LF-CC-v005",
          documentHash:    "sha256-v005-agreement-" + inquiryId,
          clientName:      filled(clientName),
          designation:     filled(designation),
          affiliation:     filled(affiliation),
          projectTitle:    filled(projectTitle),
          fundingAgency:   filled(fundingAgency),
          inquiryId,
          projectPid:        projectPid    || undefined,
          projectRequestId:  projectRequestId || undefined,
          createdBy:       clientEmail,
          clientIpAddress: ipAddress,
          userAgent:       typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
          agreementDate:   now,
          createdAt:       now,
          status:          "completed",
          clientSignature: {
            method:    "typed_name",
            data:      filled(clientName),
            timestamp: now,
          },
          programDirectorSignature: {
            method:    "auto_approved",
            data:      "VICTOR MARCO EMMANUEL N. FERRIOLS, Ph.D.",
            signedBy:  "vferriols@pgc.up.edu.ph",
            timestamp: now,
          },
        },
      };

      // 2. Save directly to Firestore using Client SDK (preferred for auth-context rules)
      await setDoc(doc(db, "clientConformes", conformeId), conformeRecord.data);

      console.log("✅ Client Conforme saved:", conformeId);
      toast.success("Client Conforme agreement recorded successfully", { duration: 3000 });
      setSavedRecord(conformeRecord);
      setAgreed(false);
      // Note: onConfirm will be called after user clicks "Done" in success screen
    } catch (error: any) {
      console.error("❌ Error saving Client Conforme:", error);
      const msg = error?.message || String(error);
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
    // Only call onCancel if we didn't just save a record
    if (!savedRecord) {
      onCancel();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleCancel()}>
      <DialogContent className="max-w-4xl w-full flex flex-col h-[90vh] max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-slate-200 shrink-0">
          <DialogTitle className="text-lg font-bold text-slate-800">
            Client Conforme — PGCV-LF-CC-v005
          </DialogTitle>
          <p className="text-sm text-slate-500 mt-1">
            Please read the entire document carefully before agreeing.
          </p>
        </DialogHeader>

        {/* Scrollable document body */}
        <ScrollArea className="flex-1 min-h-0 w-full">
          {savedRecord ? (
            <div className="flex flex-col items-center justify-center h-full py-20 px-8 text-center space-y-6">
              <div className="bg-green-100 p-4 rounded-full">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-slate-900">Agreement Recorded!</h3>
                <p className="text-slate-600 max-w-md mx-auto">
                  Your Client Conforme agreement has been securely recorded and digitally signed. 
                  You can now download a copy for your records or proceed with your project submission.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <DownloadConformeButton 
                  conforme={savedRecord} 
                  variant="default" 
                  size="lg"
                  showText={true}
                />
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => {
                    setSavedRecord(null);
                    onConfirm();
                  }}
                >
                  Proceed to Submission
                </Button>
              </div>
            </div>
          ) : (
            <div className="px-8 py-6 text-sm text-slate-700 leading-relaxed space-y-8 font-serif">
              {/* Header block with logos */}
              {/* ... (rest of the document content) */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex-1 border-b border-slate-300 pb-2">
                <p className="font-bold text-lg text-slate-900 uppercase">
                  Philippine Genome Center Visayas
                </p>
                <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-sans">
                  PGCV-LF-CC-v005 · Client Conforme
                </p>
              </div>
            </div>

            {/* Agreement preamble */}
            <div className="space-y-4">
              <p className="text-slate-500 text-xs italic border-l-4 border-slate-200 pl-3">
                Please fill out the information highlighted in gray. Do not leave anything blank.
                Put N/A for information that is not applicable.
              </p>

              <p className="text-justify leading-relaxed">
                This agreement is made between{" "}
                <span className="font-bold underline bg-slate-100 px-1 rounded inline-block min-w-[150px] text-center">
                  {filled(clientName)}
                </span>
                ,{" "}
                <span className="font-bold underline bg-slate-100 px-1 rounded inline-block min-w-[120px] text-center">
                  {filled(designation)}
                </span>{" "}
                of the{" "}
                <span className="font-bold underline bg-slate-100 px-1 rounded inline-block min-w-[200px] text-center">
                  {filled(affiliation)}
                </span>
                , hereafter referred to as &ldquo;Client&rdquo; with Client ID{" "}
                <span className="italic text-slate-500 font-sans text-xs">
                  _______________ (to be filled up by PGC Visayas)
                </span>{" "}
                and the Philippine Genome Center Visayas (PGC Visayas), herein referred to as
                &ldquo;PGC Visayas&rdquo;, and covers all jobs under the Project/Study entitled:
              </p>

              <div className="border-2 border-dashed border-slate-300 p-4 font-bold bg-slate-50 rounded-md text-slate-900 text-center uppercase">
                {filled(projectTitle, "_______________________________________________")}
              </div>

              <p className="text-justify">
                with funding from the (Name of Funding Agency/Source of Fund){" "}
                <span className="font-bold underline bg-slate-100 px-1 rounded inline-block min-w-[150px] text-center">
                  {filled(fundingAgency)}
                </span>
              </p>
            </div>

            {/* Section I */}
            <div className="space-y-2">
              <p className="font-bold text-slate-900">
                I. Summary of the Deliverables of the Project
              </p>
              <p>
                <span className="font-semibold">1.</span> The Client shall require PGC Visayas to
                conduct/deliver the following services on the samples indicated in the Sample
                Submission Form for the duration of the Project (check applicable):
              </p>
              <div className="ml-4 space-y-1 text-sm text-slate-600">
                <p>☐ Nucleic Acid Extraction</p>
                <p>☐ Qubit Quantification (Fluorometer)</p>
                <p>☐ Bioanalyzer (Microchip Electrophoresis)</p>
                <p>☐ MultiSkan Sky (Spectrophotometer)</p>
                <p>
                  ☐ NGS Library Preparation (Amplicon, Metagenomics, Metabarcoding,
                  Transcriptomics, Whole Genome Sequencing)
                </p>
                <p className="ml-4">☐ Specify Application: ______________________</p>
                <p>☐ Capillary Sequencing</p>
                <p>☐ Equipment Use</p>
                <p className="ml-4">☐ Specify Equipment: _______________________</p>
                <p>☐ Retail Sale</p>
                <p className="ml-4">☐ Specify product: _______________________</p>
              </div>
              <p>
                <span className="font-semibold">2.</span> The Client shall provide the following
                information and materials, hereinafter collectively called &ldquo;Samples&rdquo; and
                Service Fee (as detailed in the Charge Slip) for the Project under Project Number{" "}
                <span className="italic text-slate-500">
                  _______________ (to be filled up by PGC Visayas)
                </span>
                .
              </p>
              <div className="ml-4 space-y-1 text-sm">
                <p>a. Client Information Sheet (For New Client)</p>
                <p>b. Sample Submission Form (For services that involve sending samples)</p>
              </div>
              <p>
                <span className="font-semibold">3.</span> In return, PGC Visayas shall provide the
                following deliverables within the duration of the service/project:
              </p>
              <div className="ml-4 space-y-1 text-sm">
                <p>☐ Service Report</p>
                <p>☐ Sequence Data</p>
                <p>☐ Not Applicable</p>
                <p>☐ Others (Specify): _____________</p>
              </div>
            </div>

            {/* Section II */}
            <div className="space-y-2">
              <p className="font-bold text-slate-900">II. Duration of the Project</p>
              <p>
                The service/project is in effect once PGC Visayas has received the samples from the
                Client and ends upon the Service Report&apos;s release. For Equipment Use and Other
                Services, the service/project is in effect upon signing this Client Conforme and ends
                once the Client has finished all necessary experiments. Any additional services beyond
                the initial scope of the agreed terms for the project are subject to additional charges
                and must be agreed between parties.
              </p>
            </div>

            {/* Section III */}
            <div className="space-y-2">
              <p className="font-bold text-slate-900">
                III. Compliance with Sample Submission Requirements
              </p>
              <p>
                The Client agrees to conform to the Sample Submission Requirements set by PGC Visayas,
                who will, upon acceptance of the samples, inspect them and perform necessary quality
                check assays prior to any analysis. If the samples do not pass the inspection or the
                quality checks, PGC Visayas has the right to reject them and request the Client submit
                new samples. Should the Client wish to proceed without resending new samples, the Client
                agrees that PGC Visayas will not be liable for the resulting outcomes.
              </p>
            </div>

            {/* Section IV */}
            <div className="space-y-2">
              <p className="font-bold text-slate-900">IV. Sample Retention</p>
              <p>
                All submitted samples (blood, bacteria, RNA, DNA, tissue, etc.) will be discarded
                immediately after processing, except for sanger sequencing and NGS samples, which will
                be discarded one week after the Project has ended. For nucleic acid extraction, a backup
                of the purified DNA or RNA will be kept one week after the project has ended. Back-up
                sequence files will be kept for one month, during which the Client may have his or her
                data re-sent for whatever purpose. For NGS, libraries will be kept for six (6) months,
                and backup files will be kept for one (1) year only. The Client may request PGC Visayas
                not to keep any backup files or samples. In this case, PGC Visayas will discard all
                samples and data upon project completion.
              </p>
            </div>

            {/* Section V */}
            <div className="space-y-2">
              <p className="font-bold text-slate-900">V. Confidentiality</p>
              <p>
                PGC Visayas agrees to keep all data strictly confidential and will be accessible only
                to those involved in the project, as agreed upon by PGC Visayas and the Client.
              </p>
            </div>

            {/* Section VI */}
            <div className="space-y-2">
              <p className="font-bold text-slate-900">VI. Ownership</p>
              <p>
                The Client holds ownership of all the data and intellectual property rights of this
                Project{" "}
                <span className="italic text-slate-500">
                  _______________ (to be filled up by PGC Visayas)
                </span>
                . However, PGC Visayas should be cited in any presentations and publications resulting
                from the service, e.g. &ldquo;The samples were sequenced or processed by the Philippine
                Genome Center Visayas Satellite Facility&rdquo;.
              </p>
            </div>

            {/* Section VII */}
            <div className="space-y-2">
              <p className="font-bold text-slate-900">VII. Terms of Payment</p>
              <p>
                The Client agrees that payment should be received within thirty (30) days after the
                receipt of the Charge Slip. Should the Client fail to comply with this requirement, any
                deliverables stipulated in Section I shall not be released.
              </p>
            </div>

            {/* Signature block */}
            <div className="mt-6 grid grid-cols-2 gap-10">
              {/* Client */}
              <div className="space-y-6">
                <p className="font-semibold text-slate-800">Client:</p>
                <div className="space-y-1">
                  <div className="border-b-2 border-slate-400 pb-1 font-semibold text-slate-800">
                    {filled(clientName)}
                  </div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">
                    Printed Name and Signature
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="border-b-2 border-slate-400 pb-1 text-slate-800">{today}</div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Date</p>
                </div>
              </div>

              {/* PGC Visayas */}
              <div className="space-y-6">
                <p className="font-semibold text-slate-800">PGC Visayas:</p>
                <div className="space-y-1">
                  <div className="border-b-2 border-slate-400 pb-1 font-semibold text-slate-800">
                    VICTOR MARCO EMMANUEL N. FERRIOLS, Ph.D.
                  </div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">
                    Program Director — PGC Visayas
                  </p>
                </div>
              </div>
            </div>
          </div>
          )}
        </ScrollArea>

        {/* Footer: agree checkbox + buttons (hide if saved) */}
        {!savedRecord && (
          <div className="shrink-0 border-t border-slate-200 px-6 py-4 bg-slate-50 space-y-4">
            <label className="flex items-start gap-3 cursor-pointer group">
              <Checkbox
                id="conforme-agree"
                checked={agreed}
                onCheckedChange={(v) => setAgreed(v === true)}
                className="mt-0.5 shrink-0"
              />
              <span className="text-sm text-slate-700 group-hover:text-slate-900 transition-colors">
                I have read and understood the Client Conforme and I agree to its terms and conditions.
              </span>
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
                    {saving ? "Recording Agreement…" : "Submitting…"}
                  </>
                ) : (
                  "Submit for Approval"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
