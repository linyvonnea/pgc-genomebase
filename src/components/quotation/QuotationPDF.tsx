// src/app/components/quotation/QuotationPDF.tsx
"use client";

import { Page, Text, View, Document, StyleSheet, Image } from "@react-pdf/renderer";
import { SelectedService } from "@/types/Quotation";
import { pgcLogo, schoolLogo } from "@/assets/logosBase64";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", lineHeight: 1.4 },
  logoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  logo: { width: 60, height: 60 },
  pgcLogo: { width: 200, height: 60, objectFit: "contain" },
  title: { fontSize: 14, fontWeight: "bold", textAlign: "center", marginVertical: 4 },
  subtitle: { fontSize: 10, textAlign: "center", marginBottom: 16 },
  section: { marginBottom: 10 },
  label: { fontWeight: "bold" },
  table: { width: "100%", borderTop: "1pt solid black", borderLeft: "1pt solid black" },
  tableRow: { flexDirection: "row" },
  tableHeader: { fontWeight: "bold", backgroundColor: "#eee" },
  headerCell: { flex: 1, padding: 4, borderRight: "1pt solid black", borderBottom: "1pt solid black" },
  cell: { flex: 1, padding: 4, borderRight: "1pt solid black", borderBottom: "1pt solid black" },
  categoryHeader: { padding: 4, fontWeight: "bold", backgroundColor: "#f0f0f0", borderBottom: "1pt solid black", fontSize: 10 },
  summary: { marginTop: 12, alignItems: "flex-end", textAlign: "right", gap: 2 },
  italicNote: { fontStyle: "italic", fontSize: 9, marginTop: 4 },
  signature: { marginTop: 40, fontSize: 10 },
  footerSection: { marginTop: 24 },
  pageFooter: { position: "absolute", bottom: 20, left: 36, right: 36, textAlign: "center", fontSize: 9, color: "#999" },
});

function formatMoney(num: number) {
  const fixed = Math.round(num * 100) / 100;
  const parts = fixed.toString().split(".");
  let integer = parts[0];
  let decimal = parts[1] || "00";
  if (decimal.length === 1) decimal += "0";
  let result = "";
  while (integer.length > 3) {
    result = "," + integer.slice(-3) + result;
    integer = integer.slice(0, -3);
  }
  result = integer + result;
  return result + "." + decimal;
}
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

type ServiceLike = SelectedService & {
  id?: string | null;
  category?: string;
  unit: string;
  price: number;
  quantity: number;
  name: string;
};

type TotalsOverride = {
  subtotal?: number;
  discount?: number;
  total?: number;
};

export function QuotationPDF({
  services,
  clientInfo,
  referenceNumber,
  useInternalPrice,
  preparedBy,
  totalsOverride, // <-- NEW (optional)
}: {
  services: SelectedService[];
  clientInfo: { name: string; institution: string; designation: string; email: string };
  referenceNumber: string;
  useInternalPrice: boolean;
  preparedBy: { name: string; position: string };
  totalsOverride?: TotalsOverride;
}) {
  const safeServices: ServiceLike[] = (services ?? []).filter(
    (s): s is ServiceLike =>
      s != null && typeof (s as any).price === "number" && typeof (s as any).quantity === "number"
  );

  // group by category (fallback to “Uncategorized”)
  const groupedByCategory = safeServices.reduce<Record<string, ServiceLike[]>>((acc, svc) => {
    const key = svc.category && svc.category.trim() ? svc.category : "Uncategorized";
    (acc[key] ||= []).push(svc);
    return acc;
  }, {});

  // Default math (new quotes): 12% of subtotal if internal
  const computedSubtotal = r2(safeServices.reduce((sum, s) => sum + s.price * s.quantity, 0));
  const computedDiscount = useInternalPrice ? r2(computedSubtotal * 0.12) : 0;
  const computedTotal = r2(computedSubtotal - computedDiscount);

  // ✅ If overrides are provided (migrated quotes), use them
  const subtotal = totalsOverride?.subtotal ?? computedSubtotal;
  const discount = totalsOverride?.discount ?? computedDiscount;
  const total = totalsOverride?.total ?? computedTotal;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.logoRow}>
          <Image src={schoolLogo} style={styles.logo} />
          <Image src={pgcLogo} style={styles.pgcLogo} />
        </View>
        <Text style={styles.title}>QUOTATION FORM</Text>
        <Text style={styles.subtitle}>(Valid for 30 days from the date of issue)</Text>

        <View style={styles.section}>
          <Text><Text style={styles.label}>Reference No:</Text> {referenceNumber}</Text>
          <Text><Text style={styles.label}>Client Name:</Text> {clientInfo.name}</Text>
          <Text><Text style={styles.label}>Institution:</Text> {clientInfo.institution}</Text>
          <Text><Text style={styles.label}>Designation:</Text> {clientInfo.designation}</Text>
          <Text><Text style={styles.label}>Email:</Text> {clientInfo.email}</Text>
          <Text><Text style={styles.label}>Internal Client:</Text> {useInternalPrice ? "Yes" : "No"}</Text>
        </View>

        <Text style={{ marginBottom: 10 }}>
          Dear Client,{"\n"}
          Thank you for choosing Philippine Genome Center for your sequencing needs. We are pleased to quote you the following:
        </Text>

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
              {items.map((svc, idx) => {
                const amount = svc.price * svc.quantity;
                const key = `${svc.id ?? "custom"}-${svc.name}-${idx}`;
                return (
                  <View style={styles.tableRow} key={key}>
                    <Text style={styles.cell}>{svc.name}</Text>
                    <Text style={styles.cell}>{svc.unit}</Text>
                    <Text style={styles.cell}>{formatMoney(svc.price)}</Text>
                    <Text style={styles.cell}>{svc.quantity}</Text>
                    <Text style={styles.cell}>{formatMoney(amount)}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        <View style={styles.summary}>
          <Text>Subtotal: PHP {formatMoney(subtotal)}</Text>
          {useInternalPrice && discount > 0 ? (
            <Text>Less 12% discount (Internal Client): -PHP {formatMoney(discount)}</Text>
          ) : null}
          <Text style={{ fontWeight: "bold" }}>TOTAL: PHP {formatMoney(total)}</Text>
        </View>

        <View style={styles.footerSection} wrap={false}>
          <Text style={styles.italicNote}>Quote Validity: 30 days</Text>
          <Text style={styles.italicNote}>
            Total cost does not include re-runs (if applicable). Prices are subject to change without prior notice.
          </Text>

          <View style={styles.signature}>
            <Text>Sincerely,</Text>
            <Text style={{ fontWeight: "bold", marginTop: 24 }}>{preparedBy.name}</Text>
            <Text><Text style={{ fontStyle: "italic" }}>{preparedBy.position}</Text></Text>
          </View>
        </View>

        {/* Page Footer - displays page number on each page */}
        <Text 
          fixed
          style={styles.pageFooter}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        />
      </Page>
    </Document>
  );
}