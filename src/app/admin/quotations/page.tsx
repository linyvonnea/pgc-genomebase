//  src/app/admin/quotations/page.tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { mockQuotationRecords } from "@/mock/mockQuotationRecords";
import { QuotationRecord } from "@/types/Quotation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const unique = (arr: string[]) => [...new Set(arr)].sort();

export default function QuotationListPage() {
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("__all");
  const [filterPreparedBy, setFilterPreparedBy] = useState("__all");

  const filtered = mockQuotationRecords.filter((q) => {
    const matchesSearch = [
      q.referenceNumber,
      q.clientInfo.name,
      q.clientInfo.institution,
      q.clientInfo.designation,
    ]
      .filter(Boolean)
      .some((val) => val.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory =
      filterCategory && filterCategory !== "__all"
        ? q.categories.includes(filterCategory)
        : true;

    const matchesPreparedBy =
      filterPreparedBy && filterPreparedBy !== "__all"
        ? q.preparedBy === filterPreparedBy
        : true;

    return matchesSearch && matchesCategory && matchesPreparedBy;
  });

  const allCategories = unique(
    mockQuotationRecords.flatMap((r) => r.categories ?? [])
  );
  const allPreparers = unique(
    mockQuotationRecords.map((r) => r.preparedBy || "")
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex gap-4 items-end">
        <Input
          placeholder="Search by client, institution, reference..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72"
        />

        <Select onValueChange={setFilterCategory} value={filterCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All</SelectItem>
            {allCategories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select onValueChange={setFilterPreparedBy} value={filterPreparedBy}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Filter by Prepared By" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All</SelectItem>
            {allPreparers.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Reference No.</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Designation</TableHead>
            <TableHead>Institution</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Prepared By</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((q) => (
            <TableRow
              key={q.referenceNumber}
              className="cursor-pointer hover:bg-muted"
              onClick={() => {
                window.location.href = `/admin/quotations/${q.referenceNumber}`;
              }}
            >
              <TableCell>{new Date(q.dateIssued).toLocaleDateString()}</TableCell>
              <TableCell>{q.referenceNumber}</TableCell>
              <TableCell>{q.clientInfo.name}</TableCell>
              <TableCell>{q.clientInfo.designation}</TableCell>
              <TableCell>{q.clientInfo.institution}</TableCell>
              <TableCell>{q.categories.join(", ")}</TableCell>
              <TableCell>₱{q.total.toLocaleString()}</TableCell>
              <TableCell>{q.preparedBy}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}