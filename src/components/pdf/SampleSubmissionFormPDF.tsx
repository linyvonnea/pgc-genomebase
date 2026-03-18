import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { SampleFormRecord } from "@/types/SampleForm";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 8,
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
    width: "60%",
    borderRight: 1,
    borderRightColor: "#1f2937",
    padding: 8,
    justifyContent: "center",
  },
  headerRight: {
    width: "40%",
    padding: 8,
    justifyContent: "center",
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 10,
    color: "#334155",
  },
  rightTitle: {
    fontSize: 11,
    fontWeight: "bold",
    textAlign: "center",
  },
  rightSub: {
    marginTop: 2,
    fontSize: 9,
    textAlign: "center",
  },
  rightSmall: {
    marginTop: 2,
    fontSize: 7,
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
    textAlign: "center",
  },
  staffValueCell: {
    flex: 1,
    borderRight: 1,
    borderRightColor: "#1f2937",
    padding: 4,
    minHeight: 20,
    textAlign: "center",
  },
  sectionTitle: {
    textAlign: "center",
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 4,
    fontStyle: "italic",
  },
  contentGrid: {
    border: 1,
    borderColor: "#1f2937",
    flexDirection: "row",
    minHeight: 380,
  },
  leftPane: {
    width: "40%",
    borderRight: 1,
    borderRightColor: "#1f2937",
  },
  rightPane: {
    width: "60%",
  },
  paneHeader: {
    padding: 5,
    borderBottom: 1,
    borderBottomColor: "#1f2937",
    backgroundColor: "#e0f2fe",
  },
  paneHeaderText: {
    textAlign: "center",
    fontSize: 10,
    fontWeight: "bold",
  },
  block: {
    borderBottom: 1,
    borderBottomColor: "#cbd5e1",
    padding: 5,
  },
  label: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 2,
  },
  line: {
    borderBottom: 1,
    borderBottomColor: "#475569",
    minHeight: 12,
    paddingBottom: 2,
    marginBottom: 4,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  checkbox: {
    width: 9,
    height: 9,
    border: 1,
    borderColor: "#334155",
    marginRight: 4,
    textAlign: "center",
    fontSize: 7,
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
    padding: 3,
    fontWeight: "bold",
    textAlign: "center",
  },
  thCode: {
    width: "30%",
    borderRight: 1,
    borderRightColor: "#1f2937",
    padding: 3,
    fontWeight: "bold",
  },
  thConc: {
    width: "25%",
    borderRight: 1,
    borderRightColor: "#1f2937",
    padding: 3,
    fontWeight: "bold",
  },
  thVolume: {
    width: "15%",
    borderRight: 1,
    borderRightColor: "#1f2937",
    padding: 3,
    fontWeight: "bold",
  },
  thNotes: {
    width: "22%",
    padding: 3,
    fontWeight: "bold",
  },
  tdIndex: {
    width: "8%",
    borderRight: 1,
    borderRightColor: "#cbd5e1",
    borderBottom: 1,
    borderBottomColor: "#e2e8f0",
    padding: 2,
    textAlign: "center",
  },
  tdCode: {
    width: "30%",
    borderRight: 1,
    borderRightColor: "#cbd5e1",
    borderBottom: 1,
    borderBottomColor: "#e2e8f0",
    padding: 2,
  },
  tdConc: {
    width: "25%",
    borderRight: 1,
    borderRightColor: "#cbd5e1",
    borderBottom: 1,
    borderBottomColor: "#e2e8f0",
    padding: 2,
  },
  tdVolume: {
    width: "15%",
    borderRight: 1,
    borderRightColor: "#cbd5e1",
    borderBottom: 1,
    borderBottomColor: "#e2e8f0",
    padding: 2,
  },
  tdNotes: {
    width: "22%",
    borderBottom: 1,
    borderBottomColor: "#e2e8f0",
    padding: 2,
  },
  footerMeta: {
    marginTop: 6,
    fontSize: 7,
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
  // Use SampleEntry row values consistently
  const entries = Array.from({ length: 28 }, (_, index) => {
    const existing = form.entries?.find((entry) => Number(entry.row) === index + 1);
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
                Template Type (choose applicable)
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
                <Text>Env. Sample: {form.templateType?.environmentalSampleText || ""}</Text>
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
              <Text style={styles.label}>Amplicon Prep / Notes</Text>
              <Text wrap={false} style={{ fontSize: 7 }}>Target: {form.ampliconDetails?.targetGenes || ""}</Text>
              <Text wrap={false} style={{ fontSize: 7 }}>Size: {form.ampliconDetails?.targetGeneSize || ""}</Text>
              <Text wrap={false} style={{ fontSize: 7 }}>Fwd: {form.ampliconDetails?.forwardPrimerSequence || ""}</Text>
              <Text wrap={false} style={{ fontSize: 7 }}>Rev: {form.ampliconDetails?.reversePrimerSequence || ""}</Text>
            </View>
          </View>

          <View style={styles.rightPane}>
            <View style={[styles.paneHeader, { backgroundColor: "#e0f2fe" }]}>
              <Text style={styles.paneHeaderText}>TEMPLATE</Text>
            </View>
            <View style={styles.tableHead}>
              <Text style={styles.thIndex}>#</Text>
              <Text style={styles.thCode}>Sample Code</Text>
              <Text style={styles.thConc}>Conc (ng/uL)</Text>
              <Text style={styles.thVolume}>Vol (uL)</Text>
              <Text style={styles.thNotes}>Notes</Text>
            </View>
            {entries.map((entry) => (
              <View style={styles.row} key={entry.row}>
                <Text style={styles.tdIndex}>{entry.row}</Text>
                <Text style={styles.tdCode}>{entry.sampleCode || ""}</Text>
                <Text style={styles.tdConc}>{entry.concentration || ""}</Text>
                <Text style={styles.tdVolume}>{entry.volume || ""}</Text>
                <Text style={styles.tdNotes}>{entry.notes || ""}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footerMeta}>
          <Text>Document Number: {form.documentNumber || "Draft"}</Text>
          <Text>Generated: {dateNow.toLocaleDateString("en-PH")}</Text>
          <Text>Submitted by: {form.submittedByEmail}</Text>
        </View>
      </Page>
    </Document>
  );
}
