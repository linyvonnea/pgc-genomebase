import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { SampleFormPDF } from "@/components/pdf/SampleFormPDF";
import { SampleFormRecord } from "@/types/SampleForm";

export const runtime = "nodejs";

function normalizeRecord(input: Partial<SampleFormRecord>): SampleFormRecord {
  return {
    id: input.id || input.formId || "preview",
    formId: input.formId || "preview",
    inquiryId: input.inquiryId || "",
    projectId: input.projectId || "",
    projectTitle: input.projectTitle,
    clientId: input.clientId,
    submittedByEmail: input.submittedByEmail || "",
    submittedByName: input.submittedByName,
    status: input.status || "Submitted",
    createdAt: input.createdAt || new Date(),
    updatedAt: input.updatedAt || new Date(),
    totalNumberOfSamples: Number(input.totalNumberOfSamples || 0),
    sampleSource: {
      fish: !!input.sampleSource?.fish,
      crustacean: !!input.sampleSource?.crustacean,
      plant: !!input.sampleSource?.plant,
      animal: !!input.sampleSource?.animal,
      others: !!input.sampleSource?.others,
      othersText: input.sampleSource?.othersText || "",
    },
    templateType: {
      tissue: !!input.templateType?.tissue,
      blood: !!input.templateType?.blood,
      bacteria: !!input.templateType?.bacteria,
      environmentalSample: !!input.templateType?.environmentalSample,
      environmentalSampleText: input.templateType?.environmentalSampleText || "",
      genomicDNA: !!input.templateType?.genomicDNA,
      totalRNA: !!input.templateType?.totalRNA,
      cDNA: !!input.templateType?.cDNA,
      pcrProduct: !!input.templateType?.pcrProduct,
    },
    ampliconDetails: {
      targetGenes: input.ampliconDetails?.targetGenes || "",
      targetGeneSize: input.ampliconDetails?.targetGeneSize || "",
      forwardPrimerSequence: input.ampliconDetails?.forwardPrimerSequence || "",
      reversePrimerSequence: input.ampliconDetails?.reversePrimerSequence || "",
    },
    entries: Array.isArray(input.entries) ? input.entries : [],
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<SampleFormRecord>;
    const record = normalizeRecord(body || {});
    const element = createElement(SampleFormPDF, { record });
    const buffer = await renderToBuffer(element);

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline; filename=sample_form_preview.pdf",
      },
    });
  } catch (error) {
    console.error("Preview PDF API error:", error);
    return new Response("Failed to generate preview PDF.", { status: 500 });
  }
}
