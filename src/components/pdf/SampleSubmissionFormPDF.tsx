import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { SampleFormRecord } from "@/types/SampleForm";
import { pgcLogo, schoolLogo } from "@/assets/logosBase64";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 8,
    padding: 20,
    color: "#0f172a",
    backgroundColor: "#ffffff", // Ensure white background
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
  logoRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  logo: {
    width: 34,
    height: 34,
  },
  pgcLogo: {
    width: 95,
    height: 30,
    objectFit: "contain",
  },
  mainTitle: {
    fontSize: 17,
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
    backgroundColor: "#dff2ff",
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
    backgroundColor: "#dff2ff",
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

const check = (value?: boolean) => (value === true ? "[X]" : "[  ]");

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
        {/* Header Section */}
        <View style={styles.headerCard}>
          <View style={styles.headerLeft}>
            <Text style={styles.mainTitle}>SAMPLE SUBMISSION FORM</Text>
            <Text style={styles.subtitle}>PGCV-LF-SSF | Revision No. 001</Text>
            <Text style={styles.subtitle}>Date of Effectivity: January 27, 2025</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.logoRow}>
              <Image src={schoolLogo} style={styles.logo} />
              <Image src={pgcLogo} style={styles.pgcLogo} />
            </View>
            <Text style={styles.rightTitle}>Philippine Genome Center Visayas</Text>
            <Text style={styles.rightSub}>Omics Laboratory</Text>
            <Text style={styles.rightSmall}>
              Regional Research Center Building, UP Visayas, Miagao, Iloilo
            </Text>
          </View>
        </View>

        {/* Staff Section */}
        <View style={styles.staffTable}>
          <Text style={styles.sectionTitle}>To be filled out by PGC Visayas Staff</Text>
          <View style={styles.row}>
            <View style={styles.staffHeaderCell}><Text>Date Received</Text></View>
            <View style={styles.staffHeaderCell}><Text>Received by</Text></View>
            <View style={[styles.staffHeaderCell, { borderRight: 0 }]}><Text>PROJECT NO. / CLIENT ID</Text></View>
          </View>
          <View style={styles.row}>
            <View style={styles.staffValueCell}><Text>{form.adminReceivedAt ? "Recorded" : ""}</Text></View>
            <View style={styles.staffValueCell}><Text>{form.adminReceivedBy || ""}</Text></View>
            <View style={[styles.staffValueCell, { borderRight: 0 }]}>
              <Text>{form.projectId || ""} / {form.clientId || ""}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>To be accomplished by the client</Text>

        {/* Main Content Grid */}
        <View style={styles.contentGrid}>
          {/* Left Pane: Details & Checkboxes */}
          <View style={styles.leftPane}>
            <View style={[styles.paneHeader, { backgroundColor: "#ede9fe" }]}>
              <Text style={styles.paneHeaderText}>DETAILS & SOURCE</Text>
            </View>

            <View style={styles.block}>
              <Text style={styles.label}>Total Number of Samples: {form.totalNumberOfSamples || "0"}</Text>
              
              <Text style={[styles.label, { marginTop: 6 }]}>Sample Source:</Text>
              <View style={{ marginLeft: 5 }}>
                <Text>{check(form.sampleSource?.fish)} Fish</Text>
                <Text>{check(form.sampleSource?.crustacean)} Crustacean</Text>
                <Text>{check(form.sampleSource?.plant)} Plant</Text>
                <Text>{check(form.sampleSource?.animal)} Animal</Text>
                <Text>{check(form.sampleSource?.others)} Others: {form.sampleSource?.othersText || ""}</Text>
              </View>
            </View>

            <View style={styles.block}>
              <Text style={styles.label}>Template Type:</Text>
              <View style={{ marginLeft: 5 }}>
                <Text>{check(form.templateType?.tissue)} Tissue</Text>
                <Text>{check(form.templateType?.blood)} Blood</Text>
                <Text>{check(form.templateType?.bacteria)} Bacteria</Text>
                <Text>{check(form.templateType?.genomicDNA)} Genomic DNA</Text>
                <Text>{check(form.templateType?.totalRNA)} Total RNA</Text>
                <Text>{check(form.templateType?.cDNA)} cDNA</Text>
                <Text>{check(form.templateType?.pcrProduct)} PCR Product</Text>
                <Text>{check(form.templateType?.environmentalSample)} Env: {form.templateType?.environmentalSampleText || ""}</Text>
              </View>
            </View>

            <View style={styles.block}>
              <Text style={styles.label}>Amplicon / Notes:</Text>
              <Text style={{ fontSize: 7 }}>Target: {form.ampliconDetails?.targetGenes || "N/A"}</Text>
              <Text style={{ fontSize: 7 }}>Size: {form.ampliconDetails?.targetGeneSize || "N/A"}</Text>
            </View>
          </View>

          {/* Right Pane: Table */}
          <View style={styles.rightPane}>
            <View style={[styles.paneHeader, { backgroundColor: "#e0f2fe" }]}>
              <Text style={styles.paneHeaderText}>SAMPLE MATRIX</Text>
            </View>
            
            {/* Table Header */}
            <View style={styles.tableHead}>
              <Text style={[styles.thIndex, { fontSize: 7 }]}>#</Text>
              <Text style={[styles.thCode, { fontSize: 7 }]}>Sample Code</Text>
              <Text style={[styles.thConc, { fontSize: 7 }]}>Conc (ng/uL)</Text>
              <Text style={[styles.thVolume, { fontSize: 7 }]}>Vol (uL)</Text>
              <Text style={[styles.thNotes, { fontSize: 7 }]}>Notes</Text>
            </View>

            {/* Table Rows */}
            {entries.slice(0, 20).map((entry) => (
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

        {/* Footer */}
        <View style={styles.footerMeta}>
          <Text>ID: {form.documentNumber || "Draft"}</Text>
          <Text>Date: {dateNow.toLocaleDateString()}</Text>
          <Text>Client: {form.submittedByEmail}</Text>
        </View>
      </Page>
    </Document>
  );
}
