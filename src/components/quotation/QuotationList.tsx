// src/components/quotation/QuotationList.tsx
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { getAllQuotations } from "@/services/quotationService";

export default function QuotationList() {
  const { data: records = [], isLoading } = useQuery({
    queryKey: ["quotations"],
    queryFn: getAllQuotations,
  });

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">All Quotation Records</h2>
      <Separator className="mb-4" />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Reference No.</TableHead>
            <TableHead>Client Name</TableHead>
            <TableHead>Designation</TableHead>
            <TableHead>Institution</TableHead>
            <TableHead>Subtotal</TableHead>
            <TableHead>Discount</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Prepared By</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((q) => (
            <TableRow key={q.referenceNumber}>
              <TableCell>{new Date(q.dateIssued).toLocaleDateString()}</TableCell>
              <TableCell className="font-medium">{q.referenceNumber}</TableCell>
              <TableCell>{q.name}</TableCell>
              <TableCell>{q.designation}</TableCell>
              <TableCell>{q.institution}</TableCell>
              <TableCell>
                ₱
                {q.subtotal?.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </TableCell>
              <TableCell>
                ₱
                {q.discount?.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </TableCell>
              <TableCell className="font-semibold text-primary">
                ₱
                {q.total?.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </TableCell>
              <TableCell>
                {typeof q.preparedBy === "string"
                  ? q.preparedBy
                  : `${q.preparedBy?.name ?? "N/A"}, ${q.preparedBy?.position ?? "N/A"}`}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}