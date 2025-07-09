// src/components/quotation/AllQuotationsTable.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { getAllQuotations } from "@/services/quotationService";
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
  const { data: quotations = [], isLoading } = useQuery({
    queryKey: ["quotations"],
    queryFn: getAllQuotations,
  });

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
          {quotations.map((record) => (
            <TableRow key={record.referenceNumber}>
              <TableCell>{record.referenceNumber}</TableCell>
              <TableCell>{record.inquiryId}</TableCell>
              <TableCell>{record.name}</TableCell>
              <TableCell>{record.email}</TableCell>
              <TableCell>{new Date(record.dateIssued).toLocaleDateString()}</TableCell>
              <TableCell>{record.isInternal ? "Yes" : "No"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}