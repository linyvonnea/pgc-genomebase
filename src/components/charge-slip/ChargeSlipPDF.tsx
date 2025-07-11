// src/components/charge-slip/ChargeSlipPDF.tsx 
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { SelectedService } from "@/types/Quotation";
import { pgcLogo, schoolLogo } from "@/assets/logosBase64";
import { Client } from "@/types/Client";
import { Project } from "@/types/Project";
import { AdminInfo } from "@/types/Admin";

type Props = {
  services: SelectedService[];
  client: Client | null | undefined;
  project: Project | null | undefined;
  chargeSlipNumber: string;
  orNumber: string;
  useInternalPrice: boolean;
  preparedBy: AdminInfo;
  referenceNumber: string;
  clientInfo: {
    name: string;
    institution: string;
    designation: string;
    email: string;
  };
  approvedBy: string;
  dateIssued: string; // Added dateIssued to props
  subtotal: number;
  discount: number;
  total: number;
};

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: "Helvetica",
    lineHeight: 1.4,
  },
  logoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  logo: {
    width: 60,
    height: 60,
  },
  pgcLogo: {
    width: 200,
    height: 60,
    objectFit: "contain",
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 4,
  },
  subtitle: {
    fontSize: 10,
    textAlign: "center",
    marginBottom: 10,
  },
  section: {
    marginBottom: 12,
  },
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#000",
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#000",
  },
  tableHeader: {
    backgroundColor: "#eee",
    fontWeight: "bold",
  },
  cell: {
    padding: 4,
    borderRightWidth: 1,
    borderColor: "#000",
  },
  noBorder: {
    borderRightWidth: 0,
  },
  col1: { width: "38%" },
  col2: { width: "15%" },
  col3: { width: "15%" },
  col4: { width: "15%" },
  col5: { width: "17%" },
  signatureSection: {
    marginTop: 24, // Increased spacing between sections
    fontSize: 10,
  },
  signatureLabel: {
    fontWeight: "normal", // Regular font for labels
  },
  signatureName: {
    fontWeight: "bold", // Bold and capitalized names
    textTransform: "uppercase",
  },
  signaturePosition: {
    fontStyle: "italic", // Italicized positions
  },
  categoryHeader: {
    fontWeight: "bold",
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  categoryHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryHeaderCell: {
    flex: 1,
    padding: 4,
    fontWeight: "bold",
    textAlign: "center",
  },
  italicNote: {
    fontStyle: "italic",
    marginTop: 4,
  },
});

function convertToWords(amount: number): string {
  const words = [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
  ];
  const tens = [
    "",
    "",
    "twenty",
    "thirty",
    "forty",
    "fifty",
    "sixty",
    "seventy",
    "eighty",
    "ninety",
  ];

  function numberToWords(n: number): string {
    if (n < 20) return words[n];
    if (n < 100)
      return (
        tens[Math.floor(n / 10)] +
        (n % 10 ? " " + words[n % 10] : "")
      );
    if (n < 1000)
      return (
        words[Math.floor(n / 100)] +
        " hundred" +
        (n % 100 ? " and " + numberToWords(n % 100) : "")
      );
    if (n < 1000000)
      return (
        numberToWords(Math.floor(n / 1000)) +
        " thousand" +
        (n % 1000 ? " " + numberToWords(n % 1000) : "")
      );
    if (n < 1000000000)
      return (
        numberToWords(Math.floor(n / 1000000)) +
        " million" +
        (n % 1000000 ? " " + numberToWords(n % 1000000) : "")
      );
    return "";
  }

  const integerPart = Math.floor(amount);
  const decimalPart = Math.round((amount - integerPart) * 100);

  return `${numberToWords(integerPart)} pesos and ${decimalPart} centavos`;
}

export function ChargeSlipPDF({
  services,
  client,
  project,
  chargeSlipNumber,
  orNumber,
  useInternalPrice,
  preparedBy,
  referenceNumber,
  clientInfo,
  approvedBy, // Destructure approvedBy
  dateIssued, // Destructure dateIssued
  subtotal,
  discount,
  total,
}: Props) {
  const groupedByCategory = services.reduce<Record<string, SelectedService[]>>(
    (acc, svc) => {
      if (!acc[svc.category]) acc[svc.category] = [];
      acc[svc.category].push(svc);
      return acc;
    },
    {}
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Logos */}
        <View style={styles.logoRow}>
          <Image src={schoolLogo} style={styles.logo} />
          <Image src={pgcLogo} style={styles.pgcLogo} />
        </View>

        <Text style={styles.title}>CHARGE SLIP</Text>
        <Text style={styles.subtitle}>VSF-LF-CS / Revision No. 003</Text>

        {/* Metadata Section */}
        <View style={styles.section}>
          <Text>No. {chargeSlipNumber}</Text>
          <Text>Date Issued: {dateIssued}</Text> {/* Render dateIssued */}
        </View>

        {/* Client Section */}
        <View style={styles.section}>
          <Text style={{ fontWeight: "bold" }}>
            CLIENT NAME: {clientInfo.name}
          </Text>
          <Text>INCLUSIVE BILLING DATES: N/A</Text>
          <Text style={{ fontWeight: "bold" }}>
            ADDRESS: {client?.affiliationAddress || "—"}
          </Text>
          <Text style={{ fontWeight: "bold" }}>
            PAYMENT FOR: {project?.title || "—"}
          </Text>
        </View>

        {/* Service Table */}
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.cell, styles.col1]}>Service</Text>
            <Text style={[styles.cell, styles.col2]}>Unit</Text>
            <Text style={[styles.cell, styles.col3]}>Price</Text>
            <Text style={[styles.cell, styles.col4]}>Qty</Text>
            <Text style={[styles.cell, styles.col5, styles.noBorder]}>Amount</Text>
          </View>

          {Object.entries(groupedByCategory).map(([category, items]) => (
            <View key={category}>
              <View style={styles.categoryHeaderRow}>
                <Text style={styles.categoryHeaderCell}>{category}</Text>
              </View>
              {items.map((item, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <Text style={[styles.cell, styles.col1]}>{item.name}</Text>
                  <Text style={[styles.cell, styles.col2]}>{item.unit}</Text>
                  <Text style={[styles.cell, styles.col3]}>PHP {item.price.toFixed(2)}</Text>
                  <Text style={[styles.cell, styles.col4]}>{item.quantity}</Text>
                  <Text style={[styles.cell, styles.col5, styles.noBorder]}>PHP {(item.price * item.quantity).toFixed(2)}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.section}>
          <Text style={{ fontWeight: "bold" }}>Subtotal: PHP {subtotal.toFixed(2)}</Text>
          {useInternalPrice && (
            <Text>Less 12% Discount: PHP {discount.toFixed(2)}</Text>
          )}
          <Text style={{ fontWeight: "bold", fontSize: 12 }}>TOTAL: PHP {total.toFixed(2)}</Text>
        </View>

        {/* Amount in Words */}
        <View style={styles.section}>
          <Text style={{ fontWeight: "bold" }}>AMOUNT IN WORDS</Text>
          <Text>{convertToWords(total)}</Text>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.italicNote}>
            * This charge slip is valid for 30 days from the date of issue.
          </Text>
          <Text style={styles.italicNote}>
            * Payment terms: Full payment is required before the release of results.
          </Text>
        </View>

        {/* Signatures */}
        <View style={styles.signatureSection}>
          <Text style={styles.signatureLabel}>Prepared By:</Text>
          <Text style={styles.signatureName}>{preparedBy.name}</Text>
          <Text style={styles.signaturePosition}>{preparedBy.position}</Text>

          <Text style={[styles.signatureLabel, { marginTop: 16 }]}>Approved:</Text>
          <Text style={styles.signatureName}>{approvedBy}</Text>
        </View>
      </Page>
    </Document>
  );
}