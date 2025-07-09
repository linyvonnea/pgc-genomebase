// src/components/QuotationListPageClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QuotationRecord } from "@/types/Quotation";
import { getAllQuotations } from "@/services/quotationService";

import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const unique = (arr: string[]) => [...new Set(arr)].sort();

export default function QuotationListPageClient() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("__all");
  const [filterPreparedBy, setFilterPreparedBy] = useState("__all");
  const [allQuotations, setAllQuotations] = useState<QuotationRecord[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const data = await getAllQuotations();
      setAllQuotations(data);
    };
    fetchData();
  }, []);

  const filtered = allQuotations.filter((q) => {
    const matchesSearch = [
      q.referenceNumber,
      q.name,
      q.institution,
      q.designation,
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
    allQuotations.flatMap((r) => r.categories ?? [])
  );

  const allPreparers = unique(
    allQuotations
      .map((r) => r.preparedBy)
      .filter((name): name is string => !!name && name.trim() !== "")
  );

  if (!allQuotations.length) {
    return <div className="p-6 text-muted-foreground">Loading quotations...</div>;
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex gap-4 items-end">
        <Input
        id="quotation-search"
        name="quotation-search"
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
                router.push(`/admin/quotations/${q.referenceNumber}`);
              }}
            >
              <TableCell>{new Date(q.dateIssued).toLocaleDateString()}</TableCell>
              <TableCell>{q.referenceNumber}</TableCell>
              <TableCell>{q.name}</TableCell>
              <TableCell>{q.designation}</TableCell>
              <TableCell>{q.institution}</TableCell>
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