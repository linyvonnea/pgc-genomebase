import { z } from "zod";

const sampleSourceSchema = z.object({
  fish: z.boolean(),
  crustacean: z.boolean(),
  plant: z.boolean(),
  animal: z.boolean(),
  others: z.boolean(),
  othersText: z.string().trim().max(150),
});

const templateTypeSchema = z.object({
  tissue: z.boolean(),
  blood: z.boolean(),
  bacteria: z.boolean(),
  environmentalSample: z.boolean(),
  environmentalSampleText: z.string().trim().max(150),
  genomicDNA: z.boolean(),
  totalRNA: z.boolean(),
  cDNA: z.boolean(),
  pcrProduct: z.boolean(),
});

const sampleEntrySchema = z.object({
  row: z.number().int().min(1),
  sampleCode: z.string().trim().max(80),
  concentration: z.string().trim().max(80),
  volume: z.string().trim().max(80),
  notes: z.string().trim().max(200),
});

export const sampleFormSchema = z
  .object({
    totalNumberOfSamples: z.coerce.number().int().min(1).max(500),
    sampleSource: sampleSourceSchema,
    templateType: templateTypeSchema,
    ampliconDetails: z.object({
      targetGenes: z.string().trim().max(120),
      targetGeneSize: z.string().trim().max(120),
      forwardPrimerSequence: z.string().trim().max(200),
      reversePrimerSequence: z.string().trim().max(200),
    }),
    entries: z.array(sampleEntrySchema).min(1),
  })
  .superRefine((data, ctx) => {
    const hasSampleSource =
      data.sampleSource.fish ||
      data.sampleSource.crustacean ||
      data.sampleSource.plant ||
      data.sampleSource.animal ||
      data.sampleSource.others;

    if (!hasSampleSource) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sampleSource"],
        message: "Select at least one sample source.",
      });
    }

    if (data.sampleSource.others && !data.sampleSource.othersText) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sampleSource", "othersText"],
        message: "Please specify the other sample source.",
      });
    }

    const hasTemplateType =
      data.templateType.tissue ||
      data.templateType.blood ||
      data.templateType.bacteria ||
      data.templateType.environmentalSample ||
      data.templateType.genomicDNA ||
      data.templateType.totalRNA ||
      data.templateType.cDNA ||
      data.templateType.pcrProduct;

    if (!hasTemplateType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["templateType"],
        message: "Select at least one template type.",
      });
    }

    if (
      data.templateType.environmentalSample &&
      !data.templateType.environmentalSampleText
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["templateType", "environmentalSampleText"],
        message: "Please specify the environmental sample type.",
      });
    }
  });

export type SampleFormInput = z.infer<typeof sampleFormSchema>;
