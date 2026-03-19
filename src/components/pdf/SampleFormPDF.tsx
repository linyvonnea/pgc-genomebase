import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { SampleFormRecord } from "@/types/SampleForm";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    lineHeight: 1.4,
    padding: 36,
    backgroundColor: "#ffffff",
  },
  header: {
    textAlign: "center",
    marginBottom: 14,
    paddingBottom: 10,
    borderBottom: 1,
    borderBottomColor: "#000000",
  },
  title: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 8,
    marginTop: 2,
    color: "#555555",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  formId: {
    fontSize: 8,
    marginTop: 4,
    color: "#333333",
  },
  meta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 10,
  },
  metaBlock: {
    flex: 1,
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  metaLabel: {
    fontFamily: "Helvetica-Bold",
    width: 90,
    color: "#444444",
  },
  metaValue: {
    flex: 1,
    color: "#111111",
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 5,
    color: "#166FB5",
    borderBottom: 0.5,
    borderBottomColor: "#166FB5",
    paddingBottom: 2,
  },
  checkRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  checkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  checkBox: {
    width: 9,
    height: 9,
    border: 1,
    borderColor: "#333333",
  },
  checkBoxChecked: {
    width: 9,
    height: 9,
    border: 1,
    borderColor: "#166FB5",
    backgroundColor: "#166FB5",
  },
  checkLabel: {
    fontSize: 9,
  },
  table: {
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#166FB5",
    padding: "4 6",
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: 0.5,
    borderBottomColor: "#e2e8f0",
    padding: "3 6",
  },
  tableRowAlt: {
    flexDirection: "row",
    borderBottom: 0.5,
    borderBottomColor: "#e2e8f0",
    padding: "3 6",
    backgroundColor: "#f8fafc",
  },
  colRow: { width: "8%", fontSize: 8 },
  colCode: { width: "28%", fontSize: 8 },
  colConc: { width: "22%", fontSize: 8 },
  colVol: { width: "18%", fontSize: 8 },
  colNotes: { width: "24%", fontSize: 8 },
  footer: {
    marginTop: 20,
    paddingTop: 10,
    borderTop: 1,
    borderTopColor: "#cccccc",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sigBox: {
    width: "42%",
    borderTop: 1,
    borderTopColor: "#000000",
    paddingTop: 4,
    marginTop: 30,
    fontSize: 8,
    textAlign: "center",
    color: "#444444",
  },
  footerLabel: {
    fontSize: 7,
    color: "#888888",
    textAlign: "center",
    marginTop: 10,
  },
  sigName: {
    fontFamily: "Helvetica-Bold",
    textDecoration: "underline",
    marginBottom: 2,
  },
  sigLabel: {
    fontSize: 7,
    color: "#666666",
  },
});

function Checkbox({ checked, label }: { checked: boolean; label: string }) {
  return (
    <View style={styles.checkItem}>
      <View style={checked ? styles.checkBoxChecked : styles.checkBox} />
      <Text style={styles.checkLabel}>{label}</Text>
    </View>
  );
}

function MetaRow({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}:</Text>
      <Text style={styles.metaValue}>{value || "—"}</Text>
    </View>
  );
}

function formatDate(val: any): string {
  if (!val) return "—";
  let d: Date;
  if (val?.toDate) d = val.toDate();
  else if (val instanceof Date) d = val;
  else d = new Date(val);
  if (isNaN(d.getTime())) return "—";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
}

export function SampleFormPDF({ record }: { record: SampleFormRecord }) {
  const src = record.sampleSource;
  const tpl = record.templateType;
  const amp = record.ampliconDetails;
  const entries = record.entries || [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Sample Submission Form</Text>
          <Text style={styles.subtitle}>
            Philippine Genome Center Visayas — University of the Philippines Visayas
          </Text>
          <Text style={styles.formId}>
            Form ID: {record.sfid || record.formId || record.id}
          </Text>
        </View>

        {/* Meta */}
        <View style={styles.meta}>
          <View style={styles.metaBlock}>
            <MetaRow label="Submitted By" value={record.submittedByName} />
            <MetaRow label="Email" value={record.submittedByEmail} />
            <MetaRow label="Client ID" value={record.clientId} />
          </View>
          <View style={styles.metaBlock}>
            <MetaRow label="Project" value={record.projectTitle} />
            <MetaRow label="Project ID" value={record.projectId} />
            <MetaRow label="Date Submitted" value={formatDate(record.createdAt)} />
          </View>
          <View style={styles.metaBlock}>
            <MetaRow label="Status" value={record.status || "Submitted"} />
            <MetaRow label="Inquiry ID" value={record.inquiryId} />
            <MetaRow
              label="Total Samples"
              value={String(record.totalNumberOfSamples || "—")}
            />
          </View>
        </View>

        {/* Sample Source */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sample Source</Text>
          <View style={styles.checkRow}>
            <Checkbox checked={!!src?.fish} label="Fish" />
            <Checkbox checked={!!src?.crustacean} label="Crustacean" />
            <Checkbox checked={!!src?.plant} label="Plant" />
            <Checkbox checked={!!src?.animal} label="Animal" />
            <Checkbox checked={!!src?.others} label={`Others${src?.othersText ? ": " + src.othersText : ""}`} />
          </View>
        </View>

        {/* Template Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Template Type</Text>
          <View style={styles.checkRow}>
            <Checkbox checked={!!tpl?.tissue} label="Tissue" />
            <Checkbox checked={!!tpl?.blood} label="Blood" />
            <Checkbox checked={!!tpl?.bacteria} label="Bacteria" />
            <Checkbox
              checked={!!tpl?.environmentalSample}
              label={`Environmental Sample${tpl?.environmentalSampleText ? ": " + tpl.environmentalSampleText : ""}`}
            />
            <Checkbox checked={!!tpl?.genomicDNA} label="Genomic DNA" />
            <Checkbox checked={!!tpl?.totalRNA} label="Total RNA" />
            <Checkbox checked={!!tpl?.cDNA} label="cDNA" />
            <Checkbox checked={!!tpl?.pcrProduct} label="PCR Product" />
          </View>
        </View>

        {/* Amplicon Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Amplicon Details</Text>
          <View style={styles.metaBlock}>
            <MetaRow label="Target Genes" value={amp?.targetGenes} />
            <MetaRow label="Target Gene Size" value={amp?.targetGeneSize} />
            <MetaRow label="Forward Primer" value={amp?.forwardPrimerSequence} />
            <MetaRow label="Reverse Primer" value={amp?.reversePrimerSequence} />
          </View>
        </View>

        {/* Entries Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sample Entries</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.colRow}>#</Text>
              <Text style={styles.colCode}>Sample Code</Text>
              <Text style={styles.colConc}>Concentration</Text>
              <Text style={styles.colVol}>Volume</Text>
              <Text style={styles.colNotes}>Notes</Text>
            </View>
            {entries.map((entry, idx) => (
              <View
                key={idx}
                style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
              >
                <Text style={styles.colRow}>{entry.row}</Text>
                <Text style={styles.colCode}>{entry.sampleCode || ""}</Text>
                <Text style={styles.colConc}>{entry.concentration || ""}</Text>
                <Text style={styles.colVol}>{entry.volume || ""}</Text>
                <Text style={styles.colNotes}>{entry.notes || ""}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Signatures */}
        <View style={styles.footer}>
          <View style={styles.sigBox}>
            <Text style={styles.sigName}>{record.submittedByName || "NAME"}</Text>
            <Text style={styles.sigLabel}>Client Signature over Printed Name</Text>
            <Text style={styles.sigLabel}>Date: {formatDate(record.createdAt)}</Text>
          </View>
          <View style={styles.sigBox}>
            <Text style={styles.sigName}>{" "}</Text>
            <Text style={styles.sigLabel}>Laboratory Staff Signature over Printed Name</Text>
            <Text style={styles.sigLabel}>Date Received: ____________________</Text>
          </View>
        </View>

        <Text style={styles.footerLabel}>
          Philippine Genome Center Visayas Service Request Form — Page 1 of 1
        </Text>
      </Page>
    </Document>
  );
}
