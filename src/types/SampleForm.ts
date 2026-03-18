import { Timestamp } from "firebase/firestore";

export interface SampleEntry {
  row: number;
  sampleCode: string;
  concentration: string;
  volume: string;
  notes: string;
}

export interface SampleSourceSelection {
  fish: boolean;
  crustacean: boolean;
  plant: boolean;
  animal: boolean;
  others: boolean;
  othersText: string;
}

export interface TemplateTypeSelection {
  tissue: boolean;
  blood: boolean;
  bacteria: boolean;
  environmentalSample: boolean;
  environmentalSampleText: string;
  genomicDNA: boolean;
  totalRNA: boolean;
  cDNA: boolean;
  pcrProduct: boolean;
}

export interface AmpliconDetails {
  targetGenes: string;
  targetGeneSize: string;
  forwardPrimerSequence: string;
  reversePrimerSequence: string;
}

export interface SampleFormData {
  totalNumberOfSamples: number;
  sampleSource: SampleSourceSelection;
  templateType: TemplateTypeSelection;
  ampliconDetails: AmpliconDetails;
  entries: SampleEntry[];
}

export interface SampleFormRecord extends SampleFormData {
  id: string;
  formSequence?: number;
  documentNumber?: string;
  status?: "submitted" | "received" | "reviewed";
  inquiryId: string;
  projectId: string;
  projectTitle?: string;
  clientId?: string;
  submittedByEmail: string;
  submittedByName?: string;
  adminReceivedAt?: Date | string | Timestamp;
  adminReceivedBy?: string;
  reviewedAt?: Date | string | Timestamp;
  reviewedBy?: string;
  createdAt?: Date | string | Timestamp;
  updatedAt?: Date | string | Timestamp;
}

export interface SampleFormSummary {
  id: string;
  formSequence?: number;
  documentNumber?: string;
  status?: "submitted" | "received" | "reviewed";
  projectId: string;
  totalNumberOfSamples: number;
  submittedByEmail: string;
  createdAt?: Date | string | Timestamp;
}

export interface SampleFormMonitoringSummary {
  submittedCount: number;
  receivedCount: number;
  reviewedCount: number;
}

export const SAMPLE_FORM_ROW_COUNT = 28;

export const createEmptySampleEntries = (
  count: number = SAMPLE_FORM_ROW_COUNT
): SampleEntry[] =>
  Array.from({ length: count }, (_, index) => ({
    row: index + 1,
    sampleCode: "",
    concentration: "",
    volume: "",
    notes: "",
  }));

export const emptySampleFormData: SampleFormData = {
  totalNumberOfSamples: 1,
  sampleSource: {
    fish: false,
    crustacean: false,
    plant: false,
    animal: false,
    others: false,
    othersText: "",
  },
  templateType: {
    tissue: false,
    blood: false,
    bacteria: false,
    environmentalSample: false,
    environmentalSampleText: "",
    genomicDNA: false,
    totalRNA: false,
    cDNA: false,
    pcrProduct: false,
  },
  ampliconDetails: {
    targetGenes: "",
    targetGeneSize: "",
    forwardPrimerSequence: "",
    reversePrimerSequence: "",
  },
  entries: createEmptySampleEntries(),
};
