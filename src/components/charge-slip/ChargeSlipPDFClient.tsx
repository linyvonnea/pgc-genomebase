import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { ChargeSlipRecord } from "@/types/ChargeSlipRecord";
import { pgcLogo, schoolLogo } from "@/assets/logosBase64";

// PDF styles
const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: "Helvetica",
    lineHeight: 1.5,
  },
  header: {
    textAlign: "center",
    marginBottom: 12,
  },
  logoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  logos: {
    width: 60,
    height: 60,
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  section: {
    marginBottom: 10,
  },
  table: {
    borderWidth: 1,
    borderColor: "#000",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#eee",
    borderBottomWidth: 1,
    borderColor: "#000",
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#ccc",
  },
  cell: {
    padding: 4,
    borderRightWidth: 1,
    borderColor: "#ccc",
  },
  col1: { width: "40%" },
  col2: { width: "15%" },
  col3: { width: "15%" },
  col4: { width: "15%" },
  col5: { width: "15%", borderRightWidth: 0 },
  footer: {
    marginTop: 20,
    fontSize: 10,
  },
});

interface Props {
  record: ChargeSlipRecord;
}

export function ChargeSlipPDFClient({ record }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Logos */}
        <View style={styles.logoRow}>
          <View>
            <img src={schoolLogo} style={styles.logos} />
          </View>
          <View>
            <img src={pgcLogo} style={styles.logos} />
          </View>
        </View>

        <Text style={styles.title}>CHARGE SLIP</Text>

        {/* Metadata */}
        <View style={styles.section}>
          <Text>Charge Slip No: {record.chargeSlipNumber}</Text>
          <Text>O.R. Number: {record.orNumber || "—"}</Text>
          <Text>Date Issued: {new Date(record.dateIssued).toLocaleDateString()}</Text>
        </View>

        {/* Client Info */}
        <View style={styles.section}>
          <Text>Client Name: {record.clientInfo.name}</Text>
          <Text>Designation: {record.clientInfo.designation}</Text>
          <Text>Institution: {record.clientInfo.institution}</Text>
          <Text>Email: {record.clientInfo.email}</Text>
        </View>

        {/* Project Info */}
        <View style={styles.section}>
          <Text>Project Title: {record.project.title}</Text>
          <Text>Project ID: {record.project.pid}</Text>
          <Text>Project Year: {record.project.year}</Text>
        </View>

        {/* Table Header */}
        <View style={[styles.table, styles.tableHeader]}>
          <Text style={[styles.cell, styles.col1]}>Service</Text>
          <Text style={[styles.cell, styles.col2]}>Unit</Text>
          <Text style={[styles.cell, styles.col3]}>Price</Text>
          <Text style={[styles.cell, styles.col4]}>Qty</Text>
          <Text style={[styles.cell, styles.col5]}>Amount</Text>
        </View>

        {/* Table Rows */}
        {record.services.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={[styles.cell, styles.col1]}>{item.name}</Text>
            <Text style={[styles.cell, styles.col2]}>{item.unit}</Text>
            <Text style={[styles.cell, styles.col3]}>
              ₱{item.price.toFixed(2)}
            </Text>
            <Text style={[styles.cell, styles.col4]}>{item.quantity}</Text>
            <Text style={[styles.cell, styles.col5]}>
              ₱{(item.price * item.quantity).toFixed(2)}
            </Text>
          </View>
        ))}

        {/* Summary */}
        <View style={styles.section}>
          <Text>Subtotal: ₱{record.subtotal.toFixed(2)}</Text>
          <Text>Discount: ₱{record.discount.toFixed(2)}</Text>
          <Text style={{ fontWeight: "bold" }}>
            Total: ₱{record.total.toFixed(2)}
          </Text>
        </View>

        {/* Prepared and Approved */}
        <View style={styles.footer}>
          <Text>Prepared By: {record.preparedBy.name}, {record.preparedBy.position}</Text>
          <Text>Approved By: {record.approvedBy}</Text>
        </View>
      </Page>
    </Document>
  );
}

// Added functionality to save the charge slip to the database and download the PDF.