"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, AlertCircle, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  createEmptySampleEntries,
  emptySampleFormData,
  SampleFormData,
  SampleFormRecord,
} from "@/types/SampleForm";
import { sampleFormSchema } from "@/schemas/sampleFormSchema";
import { createSampleForm, getSampleFormById } from "@/services/sampleFormService";

function toClientInfoPath(
  email: string | null,
  inquiryId: string | null,
  pid: string | null
): string {
  const params = new URLSearchParams();
  if (email) params.set("email", email);
  if (inquiryId) params.set("inquiryId", inquiryId);
  if (pid) params.set("pid", pid);

  const query = params.toString();
  return query ? `/client/client-info?${query}` : "/client/client-info";
}

export default function ClientSampleFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const inquiryId = searchParams.get("inquiryId");
  const email = searchParams.get("email");
  const projectId = searchParams.get("pid");
  const projectTitle = searchParams.get("projectTitle") || undefined;
  const submittedByName = searchParams.get("name") || undefined;
  const clientId = searchParams.get("clientId") || undefined;
  const formId = searchParams.get("formId");

  const [formData, setFormData] = useState<SampleFormData>({
    ...emptySampleFormData,
    totalNumberOfSamples: 0,
    entries: createEmptySampleEntries(0),
  });
  const [loadingForm, setLoadingForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewSaving, setPreviewSaving] = useState(false);
  const previewBlobRef = useRef<string | null>(null);

  const isReadOnly = Boolean(formId);

  const backPath = useMemo(
    () => toClientInfoPath(email, inquiryId, projectId),
    [email, inquiryId, projectId]
  );

  useEffect(() => {
    if (!formId) return;

    const run = async () => {
      setLoadingForm(true);
      try {
        const record = await getSampleFormById(formId);
        if (!record) {
          toast.error("Sample form not found.");
          router.replace(backPath);
          return;
        }

        setFormData({
          totalNumberOfSamples: record.totalNumberOfSamples ?? 0,
          sampleSource: {
            fish: !!record.sampleSource?.fish,
            crustacean: !!record.sampleSource?.crustacean,
            plant: !!record.sampleSource?.plant,
            animal: !!record.sampleSource?.animal,
            others: !!record.sampleSource?.others,
            othersText: record.sampleSource?.othersText || "",
          },
          templateType: {
            tissue: !!record.templateType?.tissue,
            blood: !!record.templateType?.blood,
            bacteria: !!record.templateType?.bacteria,
            environmentalSample: !!record.templateType?.environmentalSample,
            environmentalSampleText: record.templateType?.environmentalSampleText || "",
            genomicDNA: !!record.templateType?.genomicDNA,
            totalRNA: !!record.templateType?.totalRNA,
            cDNA: !!record.templateType?.cDNA,
            pcrProduct: !!record.templateType?.pcrProduct,
          },
          ampliconDetails: {
            targetGenes: record.ampliconDetails?.targetGenes || "",
            targetGeneSize: record.ampliconDetails?.targetGeneSize || "",
            forwardPrimerSequence: record.ampliconDetails?.forwardPrimerSequence || "",
            reversePrimerSequence: record.ampliconDetails?.reversePrimerSequence || "",
          },
          entries:
            record.entries && record.entries.length > 0
              ? record.entries
              : createEmptySampleEntries(record.totalNumberOfSamples ?? 0),
        });
      } catch (error) {
        console.error("Error loading sample form:", error);
        toast.error("Failed to load sample form.");
      } finally {
        setLoadingForm(false);
      }
    };

    run();
  }, [formId, router, backPath]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const setSource = (
    key: keyof SampleFormData["sampleSource"],
    value: boolean | string
  ) => {
    setFormData((prev) => ({
      ...prev,
      sampleSource: {
        ...prev.sampleSource,
        [key]: value,
      },
    }));
  };

  // Ensure entries array length matches totalNumberOfSamples
  const syncEntriesToCount = (count: number) => {
    setFormData((prev) => {
      const current = prev.entries || [];
      const clamped = Math.max(0, Math.min(500, Math.floor(count || 0)));
      if (current.length === clamped) return { ...prev, totalNumberOfSamples: count };

      if (current.length < clamped) {
        // append empty rows
        const addCount = clamped - current.length;
        const startIndex = current.length;
        const newRows = Array.from({ length: addCount }, (_, i) => ({
          row: startIndex + i + 1,
          sampleCode: "",
          concentration: "",
          volume: "",
          notes: "",
        }));
        return {
          ...prev,
          totalNumberOfSamples: count,
          entries: [...current, ...newRows],
        };
      }

      // truncate
      const truncated = current.slice(0, clamped).map((e, idx) => ({ ...e, row: idx + 1 }));
      return { ...prev, totalNumberOfSamples: count, entries: truncated };
    });
  };

  const setTemplate = (
    key: keyof SampleFormData["templateType"],
    value: boolean | string
  ) => {
    setFormData((prev) => ({
      ...prev,
      templateType: {
        ...prev.templateType,
        [key]: value,
      },
    }));
  };

  const updateEntry = (
    rowIndex: number,
    field: "sampleCode" | "concentration" | "volume" | "notes",
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      entries: prev.entries.map((entry, idx) =>
        idx === rowIndex
          ? {
              ...entry,
              [field]: value,
            }
          : entry
      ),
    }));
  };

  const buildPreviewRecord = (): SampleFormRecord => ({
    id: formId || "preview",
    formId: formId || "preview",
    inquiryId: inquiryId || "",
    projectId: projectId || "",
    projectTitle,
    clientId,
    submittedByEmail: email || "",
    submittedByName,
    status: "Submitted",
    createdAt: new Date(),
    updatedAt: new Date(),
    totalNumberOfSamples: formData.totalNumberOfSamples,
    sampleSource: formData.sampleSource,
    templateType: formData.templateType,
    ampliconDetails: formData.ampliconDetails,
    entries: formData.entries,
  });

  const persistSampleForm = async (redirectToPortal: boolean) => {
    if (!inquiryId || !email || !projectId) {
      toast.error("Missing project context. Please open this from Client Portal.");
      return;
    }

    const result = sampleFormSchema.safeParse(formData);
    if (!result.success) {
      const firstIssue = result.error.issues[0]?.message || "Please check your form entries.";
      toast.error(firstIssue);
      return;
    }

    if (redirectToPortal) {
      setSubmitting(true);
    } else {
      setPreviewSaving(true);
    }
    try {
      console.log("Saving sample form with context:", {
        inquiryId,
        projectId,
        clientId,
        email,
      });

      await createSampleForm({
        ...result.data,
        inquiryId,
        projectId,
        projectTitle,
        clientId,
        submittedByEmail: email,
        submittedByName,
      });

      toast.success(redirectToPortal ? "Sample form submitted successfully." : "Sample form saved successfully.");
      if (redirectToPortal) {
        router.push(backPath);
      }
    } catch (error) {
      console.error("Error submitting sample form:", error);
      toast.error("Failed to save sample form. Please try again.");
    } finally {
      if (redirectToPortal) {
        setSubmitting(false);
      } else {
        setPreviewSaving(false);
      }
    }
  };

  const handleSubmit = async () => {
    await persistSampleForm(true);
  };

  useEffect(() => {
    if (!previewOpen) return;
    if (previewUrl) return;

    setPreviewLoading(true);
    setPreviewError(null);

    const generate = async () => {
      const response = await fetch("/api/generate-sample-form-pdf/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPreviewRecord()),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Preview request failed.");
      }

      const blob = await response.blob();
      if (previewBlobRef.current) URL.revokeObjectURL(previewBlobRef.current);
      const url = URL.createObjectURL(blob);
      previewBlobRef.current = url;
      setPreviewUrl(url);
    };

    generate()
      .catch((err) => {
        console.error("Preview PDF generation failed:", err);
        setPreviewError("Failed to generate PDF preview. Please try again.");
      })
      .finally(() => setPreviewLoading(false));
  }, [previewOpen, previewUrl]);

  useEffect(() => {
    if (previewOpen) return;
    if (previewBlobRef.current) URL.revokeObjectURL(previewBlobRef.current);
    previewBlobRef.current = null;
    setPreviewUrl(null);
    setPreviewError(null);
  }, [previewOpen]);

  if (loadingForm) {
    return (
      <div className="min-h-full p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#166FB5] mb-2" />
          <p className="text-slate-600">Loading sample form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50/50 to-blue-50/30 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Build Sample Submission Form</h1>
            <p className="text-sm text-slate-600">
              Complete all required sample details before submission.
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push(backPath)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Client Portal
          </Button>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-800">Sample Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Total Number of Samples</Label>
                <Input
                  type="number"
                  min={0}
                  max={500}
                  value={formData.totalNumberOfSamples}
                  disabled={isReadOnly}
                  onChange={(e) => {
                    const val = Number(e.target.value || 0);
                    syncEntriesToCount(val);
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="space-y-3 p-4 rounded-xl border bg-white">
                <div>
                  <h2 className="font-semibold text-slate-800">Sample Source</h2>
                  <p className="text-xs text-slate-500">Select all applicable sources.</p>
                </div>
                <div className="space-y-2">
                  {[
                    ["fish", "Fish"],
                    ["crustacean", "Crustacean"],
                    ["plant", "Plant"],
                    ["animal", "Animal"],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={Boolean(formData.sampleSource[key as keyof SampleFormData["sampleSource"]])}
                        disabled={isReadOnly}
                        onCheckedChange={(checked) =>
                          setSource(key as keyof SampleFormData["sampleSource"], checked === true)
                        }
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={formData.sampleSource.others}
                        disabled={isReadOnly}
                        onCheckedChange={(checked) => {
                          const enabled = checked === true;
                          setFormData((prev) => ({
                            ...prev,
                            sampleSource: {
                              ...prev.sampleSource,
                              others: enabled,
                              othersText: enabled ? prev.sampleSource.othersText : "",
                            },
                          }));
                        }}
                      />
                      <span>Others (Please specify)</span>
                    </label>
                    <Input
                      value={formData.sampleSource.othersText}
                      disabled={isReadOnly || !formData.sampleSource.others}
                      onChange={(e) => setSource("othersText", e.target.value)}
                      placeholder="Specify other sample source"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-4 rounded-xl border bg-white">
                <div>
                  <h2 className="font-semibold text-slate-800">Template Type</h2>
                  <p className="text-xs text-slate-500">
                    Choose applicable template type(s) for submitted samples.
                  </p>
                </div>
                <div className="space-y-2">
                  {[
                    ["tissue", "Tissue"],
                    ["blood", "Blood"],
                    ["bacteria", "Bacteria"],
                    ["genomicDNA", "Genomic DNA"],
                    ["totalRNA", "Total RNA"],
                    ["cDNA", "cDNA"],
                    ["pcrProduct", "PCR Product"],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={Boolean(formData.templateType[key as keyof SampleFormData["templateType"]])}
                        disabled={isReadOnly}
                        onCheckedChange={(checked) =>
                          setTemplate(key as keyof SampleFormData["templateType"], checked === true)
                        }
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={formData.templateType.environmentalSample}
                        disabled={isReadOnly}
                        onCheckedChange={(checked) => {
                          const enabled = checked === true;
                          setFormData((prev) => ({
                            ...prev,
                            templateType: {
                              ...prev.templateType,
                              environmentalSample: enabled,
                              environmentalSampleText: enabled
                                ? prev.templateType.environmentalSampleText
                                : "",
                            },
                          }));
                        }}
                      />
                      <span>Environmental Sample (water, soil, etc.)</span>
                    </label>
                    <Input
                      value={formData.templateType.environmentalSampleText}
                      disabled={isReadOnly || !formData.templateType.environmentalSample}
                      onChange={(e) =>
                        setTemplate("environmentalSampleText", e.target.value)
                      }
                      placeholder="Specify environmental sample"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 p-4 rounded-xl border bg-white">
              <h2 className="font-semibold text-slate-800">For Amplicon Sequencing Services Only</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Target Gene(s)</Label>
                  <Input
                    value={formData.ampliconDetails.targetGenes}
                    disabled={isReadOnly}
                    placeholder="e.g. 18s, 16s, COI"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        ampliconDetails: {
                          ...prev.ampliconDetails,
                          targetGenes: e.target.value,
                        },
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Target Gene Size</Label>
                  <Input
                    value={formData.ampliconDetails.targetGeneSize}
                    disabled={isReadOnly}
                    placeholder="e.g. 1500 bp"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        ampliconDetails: {
                          ...prev.ampliconDetails,
                          targetGeneSize: e.target.value,
                        },
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Forward Primer Sequence</Label>
                  <Textarea
                    value={formData.ampliconDetails.forwardPrimerSequence}
                    disabled={isReadOnly}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        ampliconDetails: {
                          ...prev.ampliconDetails,
                          forwardPrimerSequence: e.target.value,
                        },
                      }))
                    }
                    className="min-h-20"
                  />
                </div>
                <div>
                  <Label>Reverse Primer Sequence</Label>
                  <Textarea
                    value={formData.ampliconDetails.reversePrimerSequence}
                    disabled={isReadOnly}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        ampliconDetails: {
                          ...prev.ampliconDetails,
                          reversePrimerSequence: e.target.value,
                        },
                      }))
                    }
                    className="min-h-20"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-800">Sample Template Matrix</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead>
                  <tr className="bg-sky-50 text-slate-700">
                    <th className="border px-2 py-2 w-12 text-center">#</th>
                    <th className="border px-2 py-2 text-left">Sample Code</th>
                    <th className="border px-2 py-2 text-left">Concentration (ng/uL or ng)</th>
                    <th className="border px-2 py-2 text-left">Volume (uL)</th>
                    <th className="border px-2 py-2 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.entries.map((entry, idx) => (
                    <tr key={entry.row} className="bg-white">
                      <td className="border px-2 py-1 text-center text-xs text-slate-500">
                        {entry.row}
                      </td>
                      <td className="border px-2 py-1">
                        <Input
                          value={entry.sampleCode}
                          disabled={isReadOnly}
                          onChange={(e) => updateEntry(idx, "sampleCode", e.target.value)}
                          className="h-8 border-0 shadow-none focus-visible:ring-0"
                          placeholder="Sample code"
                        />
                      </td>
                      <td className="border px-2 py-1">
                        <Input
                          value={entry.concentration}
                          disabled={isReadOnly}
                          onChange={(e) => updateEntry(idx, "concentration", e.target.value)}
                          className="h-8 border-0 shadow-none focus-visible:ring-0"
                          placeholder="Concentration"
                        />
                      </td>
                      <td className="border px-2 py-1">
                        <Input
                          value={entry.volume}
                          disabled={isReadOnly}
                          onChange={(e) => updateEntry(idx, "volume", e.target.value)}
                          className="h-8 border-0 shadow-none focus-visible:ring-0"
                          placeholder="Volume"
                        />
                      </td>
                      <td className="border px-2 py-1">
                        <Input
                          value={entry.notes}
                          disabled={isReadOnly}
                          onChange={(e) => updateEntry(idx, "notes", e.target.value)}
                          className="h-8 border-0 shadow-none focus-visible:ring-0"
                          placeholder="Notes"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {!isReadOnly && (
          <div className="flex justify-end pb-3 gap-3 flex-wrap">
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  📄 Preview PDF
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl w-full h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="px-6 py-4 border-b shrink-0">
                  <DialogTitle>Sample Form PDF Preview</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-hidden flex items-center justify-center bg-muted/10">
                  {previewLoading && (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground font-medium">Preparing preview…</p>
                    </div>
                  )}
                  {!previewLoading && previewError && (
                    <div className="flex flex-col items-center gap-2 text-amber-600">
                      <AlertCircle className="h-6 w-6" />
                      <p className="text-sm font-medium">{previewError}</p>
                    </div>
                  )}
                  {!previewLoading && previewUrl && (
                    <iframe
                      src={previewUrl}
                      style={{ width: "100%", height: "100%", border: "none" }}
                      title="Sample Form PDF Preview"
                    />
                  )}
                </div>
                <div className="px-6 py-4 border-t shrink-0 flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                    Close
                  </Button>
                  <Button
                    onClick={() => persistSampleForm(false)}
                    disabled={previewSaving || previewLoading}
                    className="bg-[#166FB5] hover:bg-[#166FB5]/90"
                  >
                    {previewSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Sample Form"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-[#166FB5] hover:bg-[#166FB5]/90"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Submit Sample Form
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
