// src/components/quotation/QuotationListPageClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QuotationRecord } from "@/types/Quotation";
import { getAllQuotations } from "@/services/quotationService";
import { Badge } from "@/components/ui/badge";
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

const categoryColors: Record<string, string> = {
  Laboratory: "bg-green-100 text-green-800",
  Equipment: "bg-yellow-100 text-yellow-800",
  Bioinformatics: "bg-blue-100 text-blue-800",
  "Retail Sales": "bg-pink-100 text-pink-800",
};

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

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Quotation Records</h1>
        <p className="text-muted-foreground">View and manage all finalized quotations.</p>
      </div>

      {/* Filters */}
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

      {/* Table */}
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
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {q.categories.map((cat) => (
                    <Badge key={cat} className={categoryColors[cat] || "bg-gray-100 text-gray-800"}>
                      {cat}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>₱{q.total.toLocaleString()}</TableCell>
              <TableCell>{q.preparedBy}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}