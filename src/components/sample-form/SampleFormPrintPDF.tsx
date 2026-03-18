import { Document, Page, StyleSheet, Text } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 48,
    fontFamily: "Helvetica",
  },
});

export function SampleFormPrintPDF() {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text>Print</Text>
      </Page>
    </Document>
  );
}
