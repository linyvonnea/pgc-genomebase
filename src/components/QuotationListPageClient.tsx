//src/components/QuotationListPageClient.tsx
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
import { Search, Filter, Eye } from "lucide-react";

const unique = (arr: string[]) => [...new Set(arr)].sort();

const categoryColors: Record<string, string> = {
  Laboratory: "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border-emerald-200",
  Equipment: "bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 border-amber-200",
  Bioinformatics: "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-blue-200",
  "Retail Sales": "bg-gradient-to-r from-pink-50 to-rose-50 text-pink-700 border-pink-200",
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
      filterCategory !== "__all"
        ? q.categories.includes(filterCategory)
        : true;

    const preparedName =
      typeof q.preparedBy === "string"
        ? q.preparedBy
        : q.preparedBy?.name || "";

    const matchesPreparedBy =
      filterPreparedBy !== "__all"
        ? preparedName === filterPreparedBy
        : true;

    return matchesSearch && matchesCategory && matchesPreparedBy;
  });

  const allCategories = unique(
    allQuotations.flatMap((r) => r.categories ?? [])
  );

  const allPreparers = unique(
    allQuotations
      .map((r) =>
        typeof r.preparedBy === "string"
          ? r.preparedBy
          : r.preparedBy?.name ?? ""
      )
      .filter((name) => name.trim() !== "")
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50/50 to-blue-50/30 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Modern Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#166FB5] to-[#4038AF] bg-clip-text text-transparent">
              Quotation Records
            </h1>
            <p className="text-slate-600">View and manage all finalized quotations with advanced filtering</p>
          </div>
        </div>

        {/* Modern Filters */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-[#F69122]" />
            <h2 className="text-lg font-semibold text-slate-800">Filters & Search</h2>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="quotation-search"
                name="quotation-search"
                placeholder="Search by client, institution, reference number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-white/70 border-slate-200 focus:border-[#166FB5] focus:ring-[#166FB5]/20"
              />
            </div>

            <Select onValueChange={setFilterCategory} value={filterCategory}>
              <SelectTrigger className="w-full md:w-48 bg-white/70 border-slate-200">
                <SelectValue placeholder="Filter by Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All Categories</SelectItem>
                {allCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select onValueChange={setFilterPreparedBy} value={filterPreparedBy}>
              <SelectTrigger className="w-full md:w-64 bg-white/70 border-slate-200">
                <SelectValue placeholder="Filter by Prepared By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All Preparers</SelectItem>
                {allPreparers.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Modern Table Container */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gradient-to-r from-[#F69122] to-[#B9273A] rounded-full"></div>
                <h3 className="text-lg font-semibold text-slate-800">
                  {filtered.length} Quotation{filtered.length !== 1 ? 's' : ''}
                </h3>
              </div>
              {search || filterCategory !== "__all" || filterPreparedBy !== "__all" ? (
                <Badge variant="outline" className="text-[#166FB5] border-[#166FB5]/30 bg-[#166FB5]/5">
                  Filtered Results
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-slate-50 to-blue-50/50 border-b border-slate-100">
                  <TableHead className="font-semibold text-slate-700">Date</TableHead>
                  <TableHead className="font-semibold text-slate-700">Reference No.</TableHead>
                  <TableHead className="font-semibold text-slate-700">Client</TableHead>
                  <TableHead className="font-semibold text-slate-700">Designation</TableHead>
                  <TableHead className="font-semibold text-slate-700">Institution</TableHead>
                  <TableHead className="font-semibold text-slate-700">Categories</TableHead>
                  <TableHead className="font-semibold text-slate-700">Total</TableHead>
                  <TableHead className="font-semibold text-slate-700">Prepared By</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((q, index) => {
                  const preparedName =
                    typeof q.preparedBy === "string"
                      ? q.preparedBy
                      : q.preparedBy?.name || "—";

                  return (
                    <TableRow
                      key={q.referenceNumber}
                      className={`
                        cursor-pointer transition-all duration-200 
                        hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/30 
                        border-b border-slate-50
                        ${index % 2 === 0 ? 'bg-white/50' : 'bg-slate-50/30'}
                      `}
                      onClick={() => {
                        router.push(`/admin/quotations/${q.referenceNumber}`);
                      }}
                    >
                      <TableCell className="font-medium text-slate-700">
                        {new Date(q.dateIssued).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[#F69122] border-[#F69122]/30 bg-[#F69122]/5">
                          {q.referenceNumber}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-slate-800">{q.name}</TableCell>
                      <TableCell className="text-slate-600">{q.designation}</TableCell>
                      <TableCell className="text-slate-600">{q.institution}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {q.categories.map((cat) => (
                            <Badge
                              key={cat}
                              variant="outline"
                              className={categoryColors[cat] || "bg-gradient-to-r from-slate-50 to-gray-50 text-slate-700 border-slate-200"}
                            >
                              {cat}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-lg bg-gradient-to-r from-[#F69122] to-[#B9273A] bg-clip-text text-transparent">
                          ₱{q.total.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-700">{preparedName}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Eye className="w-4 h-4 text-[#166FB5] hover:text-[#4038AF] transition-colors" />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <div className="space-y-2">
                        <div className="text-slate-400 text-lg">No quotations found</div>
                        <div className="text-slate-500 text-sm">
                          {search || filterCategory !== "__all" || filterPreparedBy !== "__all"
                            ? "Try adjusting your filters or search terms"
                            : "No quotation records available"}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}