// src/components/quotation/AllQuotationsTable.tsx
"use client";

import { mockQuotationHistory } from "@/mock/mockQuotationHistory";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AllQuotationsTable() {
  return (
    <ScrollArea className="rounded-md border max-h-[80vh]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reference No.</TableHead>
            <TableHead>Inquiry ID</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Date Issued</TableHead>
            <TableHead>Internal?</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockQuotationHistory.map((record, index) => (
            <TableRow key={index}>
              <TableCell>{record.referenceNumber}</TableCell>
              <TableCell>{record.inquiryId}</TableCell>
              <TableCell>{record.clientInfo.name}</TableCell>
              <TableCell>{record.clientInfo.email}</TableCell>
              <TableCell>{new Date(record.dateIssued).toLocaleDateString()}</TableCell>
              <TableCell>{record.isInternal ? "Yes" : "No"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}