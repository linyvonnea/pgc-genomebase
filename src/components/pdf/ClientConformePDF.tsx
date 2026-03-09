// Client Conforme PDF Generator - for legal archival and export
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { ClientConforme } from "@/types/ClientConforme";

// Register fonts (optional - for better typography)
// Font.register({
//   family: 'Times',
//   src: '/fonts/times-roman.ttf'
// });

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Times-Roman',
    fontSize: 11,
    lineHeight: 1.4,
    padding: 40,
    backgroundColor: '#ffffff',
  },
  header: {
    textAlign: 'center',
    marginBottom: 20,
    borderBottom: 1,
    borderBottomColor: '#000000',
    paddingBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 9,
    marginTop: 3,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#666666',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000000',
  },
  paragraph: {
    marginBottom: 8,
    textAlign: 'justify',
  },
  highlight: {
    backgroundColor: '#f0f0f0',
    padding: 2,
    fontWeight: 'bold',
    textDecoration: 'underline',
  },
  list: {
    marginLeft: 15,
    marginBottom: 8,
  },
  listItem: {
    marginBottom: 3,
  },
  signatureSection: {
    marginTop: 30,
    borderTop: 1,
    borderTopColor: '#cccccc',
    paddingTop: 20,
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  signatureBox: {
    width: '45%',
    borderBottom: 2,
    borderBottomColor: '#000000',
    paddingBottom: 2,
    marginBottom: 5,
  },
  signatureName: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  signatureLabel: {
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#666666',
    textAlign: 'center',
  },
  metadata: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#666666',
    borderTop: 1,
    borderTopColor: '#cccccc',
    paddingTop: 10,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
});

interface ClientConformePDFProps {
  conforme: ClientConforme;
}

export const ClientConformePDF = ({ conforme }: ClientConformePDFProps) => {
  const { data } = conforme;
  
  const formatDate = (date: any) => {
    if (!date) return "N/A";
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const filled = (value: string | undefined, fallback = "_______________") =>
    value && value.trim() ? value.trim() : fallback;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Philippine Genome Center Visayas</Text>
          <Text style={styles.subtitle}>Client Conforme • {data.documentVersion}</Text>
        </View>

        {/* Agreement Preamble */}
        <View style={styles.section}>
          <Text style={styles.paragraph}>
            This agreement is made between{" "}
            <Text style={styles.highlight}>{filled(data.clientName)}</Text>, {" "}
            <Text style={styles.highlight}>{filled(data.designation)}</Text> of the{" "}
            <Text style={styles.highlight}>{filled(data.affiliation)}</Text>, 
            hereafter referred to as "Client" with Client ID ________________ (to be filled up by PGC Visayas) 
            and the Philippine Genome Center Visayas (PGC Visayas), herein referred to as "PGC Visayas", 
            and covers all jobs under the Project/Study entitled:
          </Text>
          
          <View style={[styles.paragraph, { textAlign: 'center', marginVertical: 10 }]}>
            <Text style={[styles.highlight, { fontSize: 12, textTransform: 'uppercase' }]}>
              {filled(data.projectTitle)}
            </Text>
          </View>

          <Text style={styles.paragraph}>
            with funding from the (Name of Funding Agency/Source of Fund){" "}
            <Text style={styles.highlight}>{filled(data.fundingAgency)}</Text>
          </Text>
        </View>

        {/* Section I - Deliverables */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>I. Summary of the Deliverables of the Project</Text>
          
          <Text style={styles.paragraph}>
            <Text style={{ fontWeight: 'bold' }}>1.</Text> The Client shall require PGC Visayas to 
            conduct/deliver the following services on the samples indicated in the Sample Submission Form 
            for the duration of the Project (check applicable):
          </Text>
          
          <View style={styles.list}>
            <Text style={styles.listItem}>☐ Nucleic Acid Extraction</Text>
            <Text style={styles.listItem}>☐ Qubit Quantification (Fluorometer)</Text>
            <Text style={styles.listItem}>☐ Bioanalyzer (Microchip Electrophoresis)</Text>
            <Text style={styles.listItem}>☐ MultiSkan Sky (Spectrophotometer)</Text>
            <Text style={styles.listItem}>☐ NGS Library Preparation (Amplicon, Metagenomics, Metabarcoding, Transcriptomics, Whole Genome Sequencing)</Text>
            <Text style={[styles.listItem, { marginLeft: 20 }]}>☐ Specify Application: ______________________</Text>
            <Text style={styles.listItem}>☐ Capillary Sequencing</Text>
            <Text style={styles.listItem}>☐ Equipment Use</Text>
            <Text style={[styles.listItem, { marginLeft: 20 }]}>☐ Specify Equipment: _______________________</Text>
            <Text style={styles.listItem}>☐ Retail Sale</Text>
            <Text style={[styles.listItem, { marginLeft: 20 }]}>☐ Specify product: _______________________</Text>
          </View>

          <Text style={styles.paragraph}>
            <Text style={{ fontWeight: 'bold' }}>2.</Text> The Client shall provide the following information 
            and materials, hereinafter collectively called "Samples" and Service Fee (as detailed in the Charge Slip) 
            for the Project under Project Number ________________ (to be filled up by PGC Visayas).
          </Text>

          <View style={styles.list}>
            <Text style={styles.listItem}>a. Client Information Sheet (For New Client)</Text>
            <Text style={styles.listItem}>b. Sample Submission Form (For services that involve sending samples)</Text>
          </View>

          <Text style={styles.paragraph}>
            <Text style={{ fontWeight: 'bold' }}>3.</Text> In return, PGC Visayas shall provide the following 
            deliverables within the duration of the service/project:
          </Text>

          <View style={styles.list}>
            <Text style={styles.listItem}>☐ Service Report</Text>
            <Text style={styles.listItem}>☐ Sequence Data</Text>
            <Text style={styles.listItem}>☐ Not Applicable</Text>
            <Text style={styles.listItem}>☐ Others (Specify): _____________</Text>
          </View>
        </View>

        {/* Continue with other sections... */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>II. Duration of the Project</Text>
          <Text style={styles.paragraph}>
            The service/project is in effect once PGC Visayas has received the samples from the Client and ends 
            upon the Service Report's release. For Equipment Use and Other Services, the service/project is in 
            effect upon signing this Client Conforme and ends once the Client has finished all necessary experiments. 
            Any additional services beyond the initial scope of the agreed terms for the project are subject to 
            additional charges and must be agreed between parties.
          </Text>
        </View>

        {/* Add remaining sections III-VII here... */}
        
        {/* Signatures */}
        <View style={styles.signatureSection}>
          <Text style={[styles.sectionTitle, { textAlign: 'center', marginBottom: 20 }]}>Digital Signatures</Text>
          
          <View style={styles.signatureRow}>
            <View style={{ width: '45%' }}>
              <Text style={[styles.sectionTitle, { fontSize: 10, marginBottom: 10 }]}>Client:</Text>
              <View style={styles.signatureBox}>
                <Text style={styles.signatureName}>
                  {data.clientSignature?.data || data.clientName}
                </Text>
              </View>
              <Text style={styles.signatureLabel}>Printed Name and Digital Signature</Text>
              <View style={[styles.signatureBox, { marginTop: 15 }]}>
                <Text style={styles.signatureName}>
                  {formatDate(data.agreementDate)}
                </Text>
              </View>
              <Text style={styles.signatureLabel}>Date</Text>
            </View>

            <View style={{ width: '45%' }}>
              <Text style={[styles.sectionTitle, { fontSize: 10, marginBottom: 10 }]}>PGC Visayas:</Text>
              <View style={styles.signatureBox}>
                <Text style={styles.signatureName}>
                  {data.programDirectorSignature?.data || "VICTOR MARCO EMMANUEL N. FERRIOLS, Ph.D."}
                </Text>
              </View>
              <Text style={styles.signatureLabel}>Program Director — PGC Visayas</Text>
            </View>
          </View>
        </View>

        {/* Legal Metadata Footer */}
        <View style={styles.metadata}>
          <View style={styles.metadataRow}>
            <Text>Document ID: {conforme.id}</Text>
            <Text>Version: {data.documentVersion}</Text>
          </View>
          <View style={styles.metadataRow}>
            <Text>Agreement Date: {formatDate(data.agreementDate)}</Text>
            <Text>Client IP: {data.clientIpAddress}</Text>
          </View>
          <View style={styles.metadataRow}>
            <Text>Document Hash: {data.documentHash}</Text>
            <Text>Status: {data.status.toUpperCase()}</Text>
          </View>
          <View style={[styles.metadataRow, { marginTop: 5, borderTop: 0.5, paddingTop: 5 }]}>
            <Text style={{ fontSize: 7, fontStyle: 'italic' }}>
              This document was digitally signed and is legally binding. 
              Generated on {new Date().toLocaleDateString("en-PH")} by PGC Visayas Document Management System.
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};