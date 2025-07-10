"use client";

import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { SelectedService } from "@/types/Quotation";
import { pgcLogo, schoolLogo } from "@/assets/logosBase64";

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
    marginBottom: 16,
  },
  section: {
    marginBottom: 10,
  },
  label: {
    fontWeight: "bold",
  },
  table: {
    width: "100%",
    borderTop: "1pt solid black",
    borderLeft: "1pt solid black",
  },
  tableRow: {
    flexDirection: "row",
  },
  tableHeader: {
    fontWeight: "bold",
    backgroundColor: "#eee",
  },
  headerCell: {
    flex: 1,
    padding: 4,
    borderRight: "1pt solid black",
    borderBottom: "1pt solid black",
  },
  cell: {
    flex: 1,
    padding: 4,
    borderRight: "1pt solid black",
    borderBottom: "1pt solid black",
  },
  categoryHeader: {
    padding: 4,
    fontWeight: "bold",
    backgroundColor: "#f0f0f0",
    borderBottom: "1pt solid black",
    fontSize: 10,
  },
  summary: {
    marginTop: 12,
    alignItems: "flex-end",
    textAlign: "right",
  },
  italicNote: {
    fontStyle: "italic",
    fontSize: 9,
    marginTop: 4,
  },
  signature: {
    marginTop: 40,
    fontSize: 10,
  },
});

export function QuotationPDF({
  services,
  clientInfo,
  referenceNumber,
  useInternalPrice,
  preparedBy,
}: {
  services: SelectedService[];
  clientInfo: {
    name: string;
    institution: string;
    designation: string;
    email: string;
  };
  referenceNumber: string;
  useInternalPrice: boolean;
  preparedBy: {
    name: string;
    position: string;
  };
}) {
  const groupedByCategory = services.reduce<Record<string, SelectedService[]>>(
    (acc, svc) => {
      if (!acc[svc.category]) acc[svc.category] = [];
      acc[svc.category].push(svc);
      return acc;
    },
    {}
  );

  const totalWithoutDiscount = services.reduce(
    (sum, svc) => sum + svc.quantity * svc.price,
    0
  );

  const discount = useInternalPrice ? totalWithoutDiscount * 0.12 : 0;
  const finalTotal = totalWithoutDiscount - discount;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.logoRow}>
          <Image src={schoolLogo} style={styles.logo} />
          <Image src={pgcLogo} style={styles.pgcLogo} />
        </View>
        <Text style={styles.title}>QUOTATION FORM</Text>
        <Text style={styles.subtitle}>(Valid for 30 days from the date of issue)</Text>

        {/* Client Info */}
        <View style={styles.section}>
          <Text><Text style={styles.label}>Reference No:</Text> {referenceNumber}</Text>
          <Text><Text style={styles.label}>Client Name:</Text> {clientInfo.name}</Text>
          <Text><Text style={styles.label}>Institution:</Text> {clientInfo.institution}</Text>
          <Text><Text style={styles.label}>Designation:</Text> {clientInfo.designation}</Text>
          <Text><Text style={styles.label}>Email:</Text> {clientInfo.email}</Text>
          <Text><Text style={styles.label}>Internal Client:</Text> {useInternalPrice ? "Yes" : "No"}</Text>
        </View>

        {/* Service Table */}
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.headerCell}>Service</Text>
            <Text style={styles.headerCell}>Unit</Text>
            <Text style={styles.headerCell}>Price</Text>
            <Text style={styles.headerCell}>Qty</Text>
            <Text style={styles.headerCell}>Amount</Text>
          </View>

          {Object.entries(groupedByCategory).map(([category, items]) => (
            <View key={category}>
              <Text style={styles.categoryHeader}>{category}</Text>
              {items.map((svc) => {
                const amount = svc.price * svc.quantity;
                return (
                  <View style={styles.tableRow} key={svc.id}>
                    <Text style={styles.cell}>{svc.name}</Text>
                    <Text style={styles.cell}>{svc.unit}</Text>
                    <Text style={styles.cell}>{svc.price.toFixed(2)}</Text>
                    <Text style={styles.cell}>{svc.quantity}</Text>
                    <Text style={styles.cell}>{amount.toFixed(2)}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <Text>Subtotal: PHP {totalWithoutDiscount.toFixed(2)}</Text>
          {useInternalPrice && (
            <Text>Less 12% Discount: PHP {discount.toFixed(2)}</Text>
          )}
          <Text style={{ fontWeight: "bold" }}>
            TOTAL: PHP {finalTotal.toFixed(2)}
          </Text>
        </View>

        <Text style={styles.italicNote}>Quote Validity: 30 days</Text>
        <Text style={styles.italicNote}>
          Total cost does not include re-runs (if applicable). Prices are subject to change without prior notice.
        </Text>
        <Text style={styles.italicNote}>
          *12% Discount is applicable only to the following: UP Constituents, Students, Active Consortium Members of PGC Visayas
        </Text>

        <View style={styles.signature}>
          <Text>Sincerely,</Text>
          <Text style={{ fontWeight: "bold", marginTop: 24 }}>
            {preparedBy.name}
          </Text>
          <Text>
            <Text style={{ fontStyle: "italic" }}>{preparedBy.position}</Text>
          </Text>
        </View>
      </Page>
    </Document>
  );
}