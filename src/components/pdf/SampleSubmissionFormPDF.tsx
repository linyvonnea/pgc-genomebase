import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { SampleFormRecord } from "@/types/SampleForm";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    padding: 20,
    color: "#0f172a",
  },
  headerCard: {
    border: 1,
    borderColor: "#1f2937",
    borderRadius: 4,
    flexDirection: "row",
    marginBottom: 8,
  },
  headerLeft: {
    width: "58%",
    borderRight: 1,
    borderRightColor: "#1f2937",
    padding: 10,
    justifyContent: "center",
  },
  headerRight: {
    width: "42%",
    padding: 10,
    justifyContent: "center",
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 11,
    color: "#334155",
  },
  rightTitle: {
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
  },
  rightSub: {
    marginTop: 4,
    fontSize: 10,
    textAlign: "center",
  },
  rightSmall: {
    marginTop: 4,
    fontSize: 8,
    textAlign: "center",
    color: "#475569",
  },
  staffTable: {
    border: 1,
    borderColor: "#1f2937",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
  },
  staffHeaderCell: {
    flex: 1,
    borderRight: 1,
    borderRightColor: "#1f2937",
    borderBottom: 1,
    borderBottomColor: "#1f2937",
    padding: 4,
    backgroundColor: "#f1f5f9",
  },
  staffValueCell: {
    flex: 1,
    borderRight: 1,
    borderRightColor: "#1f2937",
    padding: 6,
    minHeight: 24,
  },
  sectionTitle: {
    textAlign: "center",
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 4,
    fontStyle: "italic",
  },
  contentGrid: {
    border: 1,
    borderColor: "#1f2937",
    flexDirection: "row",
  },
  leftPane: {
    width: "48%",
    borderRight: 1,
    borderRightColor: "#1f2937",
  },
  rightPane: {
    width: "52%",
  },
  paneHeader: {
    padding: 6,
    borderBottom: 1,
    borderBottomColor: "#1f2937",
    backgroundColor: "#e0f2fe",
  },
  paneHeaderText: {
    textAlign: "center",
    fontSize: 11,
    fontWeight: "bold",
  },
  block: {
    borderBottom: 1,
    borderBottomColor: "#cbd5e1",
    padding: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 3,
  },
  line: {
    borderBottom: 1,
    borderBottomColor: "#475569",
    minHeight: 14,
    paddingBottom: 2,
    marginBottom: 4,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  checkbox: {
    width: 10,
    height: 10,
    border: 1,
    borderColor: "#334155",
    marginRight: 5,
    textAlign: "center",
    fontSize: 8,
  },
  tableHead: {
    flexDirection: "row",
    borderBottom: 1,
    borderBottomColor: "#1f2937",
    backgroundColor: "#f8fafc",
  },
  thIndex: {
    width: "8%",
    borderRight: 1,
    borderRightColor: "#1f2937",
    padding: 4,
    fontWeight: "bold",
    textAlign: "center",
  },
  thCode: {
    width: "28%",
    borderRight: 1,
    borderRightColor: "#1f2937",
    padding: 4,
    fontWeight: "bold",
  },
  thConc: {
    width: "24%",
    borderRight: 1,
    borderRightColor: "#1f2937",
    padding: 4,
    fontWeight: "bold",
  },
  thVolume: {
    width: "18%",
    borderRight: 1,
    borderRightColor: "#1f2937",
    padding: 4,
    fontWeight: "bold",
  },
  thNotes: {
    width: "22%",
    padding: 4,
    fontWeight: "bold",
  },
  tdIndex: {
    width: "8%",
    borderRight: 1,
    borderRightColor: "#cbd5e1",
    borderBottom: 1,
    borderBottomColor: "#e2e8f0",
    padding: 3,
    textAlign: "center",
  },
  tdCode: {
    width: "28%",
    borderRight: 1,
    borderRightColor: "#cbd5e1",
    borderBottom: 1,
    borderBottomColor: "#e2e8f0",
    padding: 3,
  },
  tdConc: {
    width: "24%",
    borderRight: 1,
    borderRightColor: "#cbd5e1",
    borderBottom: 1,
    borderBottomColor: "#e2e8f0",
    padding: 3,
  },
  tdVolume: {
    width: "18%",
    borderRight: 1,
    borderRightColor: "#cbd5e1",
    borderBottom: 1,
    borderBottomColor: "#e2e8f0",
    padding: 3,
  },
  tdNotes: {
    width: "22%",
    borderBottom: 1,
    borderBottomColor: "#e2e8f0",
    padding: 3,
  },
  footerMeta: {
    marginTop: 8,
    fontSize: 8,
    color: "#475569",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

const check = (value?: boolean) => (value ? "X" : "");

interface Props {
  form: SampleFormRecord;
}

export function SampleSubmissionFormPDF({ form }: Props) {
  const entries = Array.from({ length: 28 }, (_, index) => {
    const existing = form.entries?.find((entry) => entry.row === index + 1);
    return (
      existing || {
        row: index + 1,
        sampleCode: "",
        concentration: "",
        volume: "",
        notes: "",
      }
    );
  });

  const dateNow = new Date();

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.headerCard}>
          <View style={styles.headerLeft}>
            <Text style={styles.mainTitle}>SAMPLE SUBMISSION FORM</Text>
            <Text style={styles.subtitle}>PGCV-LF-SSF | Revision No. 001</Text>
            <Text style={styles.subtitle}>Date of Effectivity: January 27, 2025</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.rightTitle}>Philippine Genome Center Visayas</Text>
            <Text style={styles.rightSub}>Omics Laboratory</Text>
            <Text style={styles.rightSmall}>
              Regional Research Center Building, Road 8 New Academic Complex, UPV Miagao, Iloilo
            </Text>
          </View>
        </View>

        <View style={styles.staffTable}>
          <Text style={styles.sectionTitle}>To be filled out by PGC Visayas Staff</Text>
          <View style={styles.row}>
            <View style={styles.staffHeaderCell}>
              <Text>Date Received</Text>
            </View>
            <View style={styles.staffHeaderCell}>
              <Text>Received by</Text>
            </View>
            <View style={[styles.staffHeaderCell, { borderRight: 0 }]}>
              <Text>PROJECT NO. and CLIENT ID NO.</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.staffValueCell}>
              <Text>{form.adminReceivedAt ? "Recorded" : ""}</Text>
            </View>
            <View style={styles.staffValueCell}>
              <Text>{form.adminReceivedBy || ""}</Text>
            </View>
            <View style={[styles.staffValueCell, { borderRight: 0 }]}>
              <Text>{form.projectId || ""}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>To be accomplished by the client</Text>

        <View style={styles.contentGrid}>
          <View style={styles.leftPane}>
            <View style={[styles.paneHeader, { backgroundColor: "#ede9fe" }]}>
              <Text style={styles.paneHeaderText}>SAMPLE DETAILS</Text>
            </View>

            <View style={styles.block}>
              <Text style={styles.label}>Total Number of Samples</Text>
              <View style={styles.line}>
                <Text>{form.totalNumberOfSamples || ""}</Text>
              </View>

              <Text style={styles.label}>Sample Source (check applicable)</Text>
              <View style={styles.checkboxRow}>
                <Text style={styles.checkbox}>{check(form.sampleSource?.fish)}</Text>
                <Text>Fish</Text>
              </View>
              <View style={styles.checkboxRow}>
                <Text style={styles.checkbox}>{check(form.sampleSource?.crustacean)}</Text>
                <Text>Crustacean</Text>
              </View>
              <View style={styles.checkboxRow}>
                <Text style={styles.checkbox}>{check(form.sampleSource?.plant)}</Text>
                <Text>Plant</Text>
              </View>
              <View style={styles.checkboxRow}>
                <Text style={styles.checkbox}>{check(form.sampleSource?.animal)}</Text>
                <Text>Animal</Text>
              </View>
              <View style={styles.checkboxRow}>
                <Text style={styles.checkbox}>{check(form.sampleSource?.others)}</Text>
                <Text>Others: {form.sampleSource?.othersText || ""}</Text>
              </View>
            </View>

            <View style={styles.block}>
              <Text style={styles.label}>
                Template Type (Sample submitted; choose one unless multiple templates are submitted)
              </Text>
              <View style={styles.checkboxRow}>
                <Text style={styles.checkbox}>{check(form.templateType?.tissue)}</Text>
                <Text>Tissue</Text>
              </View>
              <View style={styles.checkboxRow}>
                <Text style={styles.checkbox}>{check(form.templateType?.blood)}</Text>
                <Text>Blood</Text>
              </View>
              <View style={styles.checkboxRow}>
                <Text style={styles.checkbox}>{check(form.templateType?.bacteria)}</Text>
                <Text>Bacteria</Text>
              </View>
              <View style={styles.checkboxRow}>
                <Text style={styles.checkbox}>{check(form.templateType?.environmentalSample)}</Text>
                <Text>Environmental Sample: {form.templateType?.environmentalSampleText || ""}</Text>
              </View>
              <View style={styles.checkboxRow}>
                <Text style={styles.checkbox}>{check(form.templateType?.genomicDNA)}</Text>
                <Text>Genomic DNA</Text>
              </View>
              <View style={styles.checkboxRow}>
                <Text style={styles.checkbox}>{check(form.templateType?.totalRNA)}</Text>
                <Text>Total RNA</Text>
              </View>
              <View style={styles.checkboxRow}>
                <Text style={styles.checkbox}>{check(form.templateType?.cDNA)}</Text>
                <Text>cDNA</Text>
              </View>
              <View style={styles.checkboxRow}>
                <Text style={styles.checkbox}>{check(form.templateType?.pcrProduct)}</Text>
                <Text>PCR Product</Text>
              </View>
            </View>

            <View style={styles.block}>
              <Text style={styles.label}>For Amplicon Sequencing Services only</Text>
              <Text>Target Gene(s): {form.ampliconDetails?.targetGenes || ""}</Text>
              <Text>Target Gene Size: {form.ampliconDetails?.targetGeneSize || ""}</Text>
              <Text>Forward Primer Sequence: {form.ampliconDetails?.forwardPrimerSequence || ""}</Text>
              <Text>Reverse Primer Sequence: {form.ampliconDetails?.reversePrimerSequence || ""}</Text>
            </View>
          </View>

          <View style={styles.rightPane}>
            <View style={[styles.paneHeader, { backgroundColor: "#e0f2fe" }]}>
              <Text style={styles.paneHeaderText}>TEMPLATE</Text>
            </View>
            <View style={styles.tableHead}>
              <Text style={styles.thIndex}>#</Text>
              <Text style={styles.thCode}>Sample Code</Text>
              <Text style={styles.thConc}>Concentration (ng/uL or ng)</Text>
              <Text style={styles.thVolume}>Volume (uL)</Text>
              <Text style={styles.thNotes}>Notes</Text>
            </View>
            {entries.map((entry) => (
              <View style={styles.row} key={entry.row}>
                <Text style={styles.tdIndex}>{entry.row}</Text>
                <Text style={styles.tdCode}>{entry.sampleCode}</Text>
                <Text style={styles.tdConc}>{entry.concentration}</Text>
                <Text style={styles.tdVolume}>{entry.volume}</Text>
                <Text style={styles.tdNotes}>{entry.notes}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footerMeta}>
          <Text>Document Number: {form.documentNumber || "PGCV-LF-SSF-"}</Text>
          <Text>Generated: {dateNow.toLocaleDateString("en-PH")}</Text>
          <Text>Submitted by: {form.submittedByEmail}</Text>
        </View>
      </Page>
    </Document>
  );
}
