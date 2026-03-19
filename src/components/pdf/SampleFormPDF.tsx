"use client";

import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet, 
  Image,
  Font 
} from "@react-pdf/renderer";
import { SampleFormRecord } from "@/types/SampleForm";
import { format } from "date-fns";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#333",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 10,
  },
  logoContainer: {
    width: 100,
  },
  headerInfo: {
    textAlign: "right",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#166FB5",
  },
  subtitle: {
    fontSize: 10,
    color: "#666",
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
    backgroundColor: "#f8fafc",
    padding: 5,
    borderLeftWidth: 3,
    borderLeftColor: "#166FB5",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  gridItem: {
    width: "50%",
    marginBottom: 5,
  },
  label: {
    fontWeight: "bold",
    color: "#64748b",
    marginBottom: 2,
  },
  value: {
    color: "#1e293b",
  },
  table: {
    display: "flex",
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginTop: 10,
  },
  tableRow: {
    margin: "auto",
    flexDirection: "row",
  },
  tableHeader: {
    backgroundColor: "#f1f5f9",
    fontWeight: "bold",
  },
  tableCol: {
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 5,
  },
  col1: { width: "10%" },
  col2: { width: "40%" },
  col3: { width: "15%" },
  col4: { width: "15%" },
  col5: { width: "20%" },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 8,
    color: "#94a3b8",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 10,
  },
});

export const SampleFormPDF = ({ record }: { record: SampleFormRecord }) => {
  const formatDate = (date: any) => {
    if (!date) return "—";
    try {
      if (typeof date === "string") return format(new Date(date), "MM-dd-yyyy");
      if (date?.toDate) return format(date.toDate(), "MM-dd-yyyy");
      return format(new Date(date), "MM-dd-yyyy");
    } catch (e) {
      return "—";
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={{ fontSize: 14, fontWeight: "bold", color: "#166FB5" }}>PGC VISAYAS</Text>
            <Text style={{ fontSize: 7 }}>GenomeBase Portal</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.title}>Sample Submission Form</Text>
            <Text style={styles.subtitle}>Form ID: {record.formId || record.id}</Text>
            <Text style={styles.subtitle}>Date: {formatDate(record.createdAt)}</Text>
          </View>
        </View>

        {/* Client & Project Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General Information</Text>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Submitted By</Text>
              <Text style={styles.value}>{record.submittedByName || "—"}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{record.submittedByEmail || "—"}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Project Title</Text>
              <Text style={styles.value}>{record.projectTitle || "—"}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Total Samples</Text>
              <Text style={styles.value}>{record.totalNumberOfSamples || 0}</Text>
            </View>
          </View>
        </View>

        {/* Source & Template */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sample Details</Text>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Sample Source</Text>
              <Text style={styles.value}>
                {[
                  record.sampleSource?.fish && "Fish",
                  record.sampleSource?.crustacean && "Crustacean",
                  record.sampleSource?.plant && "Plant",
                  record.sampleSource?.animal && "Animal",
                  record.sampleSource?.others && `Others: ${record.sampleSource?.othersText}`,
                ].filter(Boolean).join(", ") || "None selected"}
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Template Type</Text>
              <Text style={styles.value}>
                {[
                  record.templateType?.tissue && "Tissue",
                  record.templateType?.blood && "Blood",
                  record.templateType?.bacteria && "Bacteria",
                  record.templateType?.environmentalSample && `Env: ${record.templateType?.environmentalSampleText}`,
                  record.templateType?.genomicDNA && "Genomic DNA",
                  record.templateType?.totalRNA && "Total RNA",
                  record.templateType?.cDNA && "cDNA",
                  record.templateType?.pcrProduct && "PCR Product",
                ].filter(Boolean).join(", ") || "None selected"}
              </Text>
            </View>
          </View>
        </View>

        {/* Amplicon Details if relevant */}
        {(record.ampliconDetails?.targetGenes || record.ampliconDetails?.targetGeneSize) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Amplicon Details</Text>
            <View style={styles.grid}>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Target Genes</Text>
                <Text style={styles.value}>{record.ampliconDetails.targetGenes || "—"}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Target Gene Size</Text>
                <Text style={styles.value}>{record.ampliconDetails.targetGeneSize || "—"}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Forward Primer</Text>
                <Text style={styles.value}>{record.ampliconDetails.forwardPrimerSequence || "—"}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Reverse Primer</Text>
                <Text style={styles.value}>{record.ampliconDetails.reversePrimerSequence || "—"}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Sample Entries Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sample Manifest</Text>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={[styles.tableRow, styles.tableHeader]}>
              <View style={[styles.tableCol, styles.col1]}><Text>#</Text></View>
              <View style={[styles.tableCol, styles.col2]}><Text>Sample Code</Text></View>
              <View style={[styles.tableCol, styles.col3]}><Text>Conc.</Text></View>
              <View style={[styles.tableCol, styles.col4]}><Text>Vol.</Text></View>
              <View style={[styles.tableCol, styles.col5]}><Text>Notes</Text></View>
            </View>
            {/* Table Rows */}
            {record.entries?.filter(e => e.sampleCode).map((entry, index) => (
              <View key={index} style={styles.tableRow}>
                <View style={[styles.tableCol, styles.col1]}><Text>{entry.row}</Text></View>
                <View style={[styles.tableCol, styles.col2]}><Text>{entry.sampleCode}</Text></View>
                <View style={[styles.tableCol, styles.col3]}><Text>{entry.concentration || "—"}</Text></View>
                <View style={[styles.tableCol, styles.col4]}><Text>{entry.volume || "—"}</Text></View>
                <View style={[styles.tableCol, styles.col5]}><Text>{entry.notes || "—"}</Text></View>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>© {new Date().getFullYear()} Philippine Genome Center Visayas. All rights reserved.</Text>
          <Text>This document was generated automatically by GenomeBase.</Text>
        </View>
      </Page>
    </Document>
  );
};
