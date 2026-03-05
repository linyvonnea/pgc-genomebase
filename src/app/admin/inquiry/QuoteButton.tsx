"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getQuotationsByInquiryId } from "@/services/quotationService";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";

interface QuoteButtonProps {
  inquiryId: string;
}

export function QuoteButton({ inquiryId }: QuoteButtonProps) {
  const router = useRouter();

  // Fetch quotations related to this inquiry
  const { data: quotations = [], isLoading } = useQuery({
    queryKey: ["quotations", inquiryId],
    queryFn: () => getQuotationsByInquiryId(inquiryId),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  const count = quotations.length;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={() =>
              router.push(`/admin/quotations/new?inquiryId=${inquiryId}`)
            }
            variant="outline"
            size="sm"
            className="whitespace-nowrap h-8 w-[88px] px-2 text-xs bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-medium flex items-center justify-between"
          >
            <span>Quote</span>
            <div className="flex items-center justify-center w-6">
              {count > 0 && (
              {count > 0 && (
                <span className="flex items-center justify-center bg-slate-100 text-slate-600 rounded-full h-5 min-w-[20px] px-1 text-[10px] font-bold border border-slate-200">
                  {isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    count
                  )}
                </span>
              )}
            </div>
          </Button>
        </TooltipTrigger>
        
        {count > 0 && (
          <TooltipContent className="p-0 border-none shadow-lg bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
            <div className="rounded-md border bg-popover text-popover-foreground shadow-md min-w-[220px]">
              <div className="px-3 py-2 border-b bg-muted/50 rounded-t-md">
                <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                  Existing Quotations ({count})
                </h4>
              </div>
              <div className="py-1 max-h-[200px] overflow-y-auto">
                {quotations.map((q) => (
                  <div
                    key={q.id || q.referenceNumber}
                    className="px-3 py-2 hover:bg-muted/50 transition-colors border-b last:border-0 border-slate-100 cursor-pointer group"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Assuming navigation to quote detail, adjust route as needed
                      router.push(`/admin/quotations/${q.referenceNumber}`);
                    }}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-mono text-xs font-semibold text-primary group-hover:underline">
                        {q.referenceNumber}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(q.dateIssued).toLocaleDateString("en-CA")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 truncate max-w-[120px]">
                        {/* If specialized title exists, use it, otherwise categories */}
                        {q.categories?.join(", ") || "General"}
                      </span>
                      <span className="text-xs font-medium text-slate-700">
                        ₱{q.total.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
