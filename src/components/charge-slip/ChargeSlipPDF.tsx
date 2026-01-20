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
  approvedBy: {
    name: string;
    position: string;
  };
  dateIssued: string;
  subtotal: number;
  discount: number;
  total: number;
};

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 10,
    fontFamily: "Helvetica",
    lineHeight: 1.2,
  },
  logoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  logo: {
    width: 45,
    height: 45,
  },
  pgcLogo: {
    width: 150,
    height: 45,
    objectFit: "contain",
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 2,
  },
  subtitle: {
    fontSize: 10,
    textAlign: "center",
    marginBottom: 6,
  },
  section: {
    marginBottom: 8,
  },
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#000",
    marginBottom: 6,
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
    padding: 3,
    borderRightWidth: 1,
    borderColor: "#000",
  },
  noBorder: {
    borderRightWidth: 0,
  },
  col1: { width: "45%" },
  col2: { width: "15%" },
  col3: { width: "13%" },
  col4: { width: "10%" },
  col5: { width: "17%" },
  signatureSection: {
    marginTop: 12,
    fontSize: 10,
  },
  signatureLabel: {
    fontWeight: "normal",
  },
  signatureName: {
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  signaturePosition: {
    fontStyle: "italic",
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
    padding: 3,
    fontWeight: "bold",
    textAlign: "left",
  },
  italicNote: {
    fontStyle: "italic",
    marginTop: 2,
  },
  bold: {
    fontWeight: "bold",
  },
  totalText: {
    fontWeight: "bold",
    fontSize: 12,
  },
  marginTop16: {
    marginTop: 12,
  },
});

function convertToWords(amount: number): string {
  const ones = [
    "", "one", "two", "three", "four", "five", "six",
    "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen",
    "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
  ];
  const tens = [
    "", "", "twenty", "thirty", "forty", "fifty",
    "sixty", "seventy", "eighty", "ninety",
  ];
  const scales = ["", "thousand", "million", "billion", "trillion"];

  function chunkNumber(n: number): number[] {
    const chunks = [];
    while (n > 0) {
      chunks.push(n % 1000);
      n = Math.floor(n / 1000);
    }
    return chunks;
  }

  function chunkToWords(chunk: number): string {
    let str = "";
    const hundred = Math.floor(chunk / 100);
    const remainder = chunk % 100;

    if (hundred > 0) {
      str += ones[hundred] + " hundred";
      if (remainder > 0) str += " ";
    }

    if (remainder > 0) {
      if (remainder < 20) {
        str += ones[remainder];
      } else {
        const ten = Math.floor(remainder / 10);
        const unit = remainder % 10;
        str += tens[ten];
        if (unit > 0) str += " " + ones[unit];
      }
    }

    return str;
  }

  function numberToWords(n: number): string {
    if (n === 0) return "zero";
    const chunks = chunkNumber(n);
    const words: string[] = [];

    for (let i = chunks.length - 1; i >= 0; i--) {
      const chunk = chunks[i];
      if (chunk === 0) continue;
      const chunkWord = chunkToWords(chunk);
      const scale = scales[i];
      words.push(chunkWord + (scale ? " " + scale : ""));
    }

    return words.join(" ");
  }

  const integerPart = Math.floor(amount);
  const decimalPart = Math.round((amount - integerPart) * 100);

  const pesoWords = numberToWords(integerPart) + " peso" + (integerPart === 1 ? "" : "s");
  const centavoWords = decimalPart === 0
    ? "zero centavos"
    : numberToWords(decimalPart) + " centavo" + (decimalPart === 1 ? "" : "s");

  return `${pesoWords} and ${centavoWords} only`.toUpperCase();
}

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
  approvedBy,
  dateIssued,
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

        {/* Metadata */}
        <View style={styles.section}>
          <Text>No. {chargeSlipNumber}</Text>
          <Text>
            Date Issued: {new Date(dateIssued).toLocaleDateString("en-PH", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Text>
        </View>

        {/* Client Info */}
        <View style={styles.section}>
          <Text style={styles.bold}>CLIENT NAME: {clientInfo.name}</Text>
          <Text style={styles.bold}>ADDRESS: {client?.affiliationAddress || "—"}</Text>
          <Text style={styles.bold}>PAYMENT FOR: {project?.title || "—"}</Text>
        </View>

        {/* Table */}
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
                  <Text style={[styles.cell, styles.col1, { textAlign: "left" }]}>{item.name}</Text>
                  <Text style={[styles.cell, styles.col2]}>{item.unit}</Text>
                  <Text style={[styles.cell, styles.col3]}>PHP {formatMoney(item.price)}</Text>
                  <Text style={[styles.cell, styles.col4]}>{item.quantity}</Text>
                  <Text style={[styles.cell, styles.col5, styles.noBorder]}>
                    PHP {formatMoney(item.price * item.quantity)}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={[styles.section, { alignItems: "flex-end" }]}>
          <Text style={styles.bold}>Subtotal: PHP {formatMoney(subtotal)}</Text>
          {useInternalPrice && (
            <Text>Less 12% Discount: PHP {formatMoney(discount)}</Text>
          )}
          <Text style={styles.totalText}>TOTAL: PHP {formatMoney(total)}</Text>
        </View>

        {/* Amount in Words */}
        <View style={styles.section}>
          <Text style={styles.bold}>AMOUNT IN WORDS</Text>
          <Text>{convertToWords(total)}</Text>
        </View>

        {/* Notes */}
        <View style={[styles.section, { marginBottom: 8 }]}>
          <Text style={styles.italicNote}>* This charge slip is valid for 30 days from the date of issue.</Text>
          <Text style={styles.italicNote}>* Payment terms: Full payment is required before the release of results.</Text>
          <Text style={styles.italicNote}>* 12% Discount is applicable only to the following: UP Constituents, Students, and Active PGC Visayas.</Text>
        </View>

        {/* Signatures */}
        <View style={[styles.signatureSection, { marginTop: 10 }]}>
          <Text style={styles.signatureLabel}>Prepared By:</Text>
          <Text>{"\n"}</Text>
          <Text style={styles.signatureName}>{preparedBy.name}</Text>
          <Text style={styles.signaturePosition}>{preparedBy.position}</Text>

          <Text style={[styles.signatureLabel, styles.marginTop16]}>Approved:</Text>
          <Text>{"\n"}</Text>
          <Text style={styles.signatureName}>{approvedBy.name}</Text>
          <Text style={styles.signaturePosition}>{approvedBy.position}</Text>
        </View>
      </Page>
    </Document>
  );
}