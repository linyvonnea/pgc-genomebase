// src/components/quotation/QuotationList.tsx
"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { mockQuotationRecords } from "@/mock/mockQuotationRecords";
import { QuotationRecord } from "@/types/Quotation";

export default function QuotationList() {
  const [records, setRecords] = useState<QuotationRecord[]>(mockQuotationRecords);

  const handleRemarkChange = (index: number, value: string) => {
    const updated = [...records];
    setRecords(updated);
  };

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
          {records.map((q, i) => (
            <TableRow key={q.referenceNumber}>
              <TableCell>{new Date(q.dateIssued).toLocaleDateString()}</TableCell>
              <TableCell className="font-medium">{q.referenceNumber}</TableCell>
              <TableCell>{q.clientInfo.name}</TableCell>
              <TableCell>{q.clientInfo.designation}</TableCell>
              <TableCell>{q.clientInfo.institution}</TableCell>
              <TableCell>₱{q.subtotal?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
              <TableCell>₱{q.discount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
              <TableCell className="font-semibold text-primary">
                ₱{q.total?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell>{q.preparedBy}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}