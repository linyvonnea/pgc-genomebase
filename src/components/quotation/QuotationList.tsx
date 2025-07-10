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
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { getAllQuotations } from "@/services/quotationService";
import { FileText, TrendingUp } from "lucide-react";

export default function QuotationList() {
  const { data: records = [], isLoading } = useQuery({
    queryKey: ["quotations"],
    queryFn: getAllQuotations,
  });

  if (isLoading) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-1/4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 overflow-hidden">
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-[#166FB5]/10 to-[#4038AF]/10 rounded-lg">
              <FileText className="w-5 h-5 text-[#166FB5]" />
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-[#166FB5] to-[#4038AF] bg-clip-text text-transparent">
                All Quotation Records
              </h2>
              <p className="text-sm text-slate-600">Complete list of generated quotations</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#F69122]" />
            <Badge variant="outline" className="text-[#F69122] border-[#F69122]/30 bg-[#F69122]/5">
              {records.length} Record{records.length !== 1 ? 's' : ''}
            </Badge>
          </div>
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
              <TableHead className="font-semibold text-slate-700">Subtotal</TableHead>
              <TableHead className="font-semibold text-slate-700">Discount</TableHead>
              <TableHead className="font-semibold text-slate-700">Total</TableHead>
              <TableHead className="font-semibold text-slate-700">Prepared By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((q, index) => (
              <TableRow 
                key={q.referenceNumber}
                className={`
                  transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/30 
                  border-b border-slate-50
                  ${index % 2 === 0 ? 'bg-white/50' : 'bg-slate-50/30'}
                `}
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
                <TableCell className="font-medium text-slate-700">
                  ₱{q.subtotal?.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </TableCell>
                <TableCell className="text-green-600 font-medium">
                  {q.discount > 0 ? (
                    <span className="flex items-center gap-1">
                      -₱{q.discount?.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="font-bold text-lg bg-gradient-to-r from-[#F69122] to-[#B9273A] bg-clip-text text-transparent">
                    ₱{q.total?.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </TableCell>
                <TableCell className="text-slate-700">
                  {typeof q.preparedBy === "string"
                    ? q.preparedBy
                    : `${q.preparedBy?.name ?? "N/A"}, ${q.preparedBy?.position ?? "N/A"}`}
                </TableCell>
              </TableRow>
            ))}
            {records.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12">
                  <div className="space-y-2">
                    <div className="text-slate-400 text-lg">No quotation records found</div>
                    <div className="text-slate-500 text-sm">Start by creating your first quotation</div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}