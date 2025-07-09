// src/components/quotation/QuotationHistoryPanel.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { getQuotationsByInquiryId } from "@/services/quotationService";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FileTextIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QuotationPDFViewer } from "./QuotationPDFViewer";

export function QuotationHistoryPanel({ inquiryId }: { inquiryId: string }) {
  console.log("🧩 [HistoryPanel] Received inquiryId prop:", JSON.stringify(inquiryId));

  const { data: history = [], isLoading, error, isFetched } = useQuery({
    queryKey: ["quotationHistory", inquiryId],
    queryFn: () => getQuotationsByInquiryId(inquiryId),
    enabled: typeof inquiryId === "string" && inquiryId.trim().length > 0,
  });

  if (error) {
    console.error("❌ [HistoryPanel] Error fetching quotation history:", error);
    return <div className="text-red-500 text-sm">Failed to load quotation history.</div>;
  }

  if (!isLoading && isFetched) {
    console.log(`✅ [HistoryPanel] Found ${history.length} quotation(s) for inquiryId: ${inquiryId}`);
  }

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading history...</div>;

  if (history.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No past quotations yet for <code>{inquiryId}</code>.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold">Quotation History</h4>
      <ScrollArea className="max-h-80 pr-2">
        <div className="space-y-3">
          {history.map((quote, index) => (
            <Card key={index} className="p-3 border flex justify-between items-start">
              <div>
                <div className="font-medium text-sm">{quote.referenceNumber}</div>
                <div className="text-xs text-muted-foreground">
                  Issued: {new Date(quote.dateIssued).toLocaleString()}
                </div>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    className="text-sm px-2 h-auto"
                  >
                    <FileTextIcon className="w-4 h-4 mr-1" /> PDF
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl h-[90vh] overflow-hidden">
                  <DialogHeader>
                    <DialogTitle>{quote.referenceNumber}</DialogTitle>
                  </DialogHeader>
                  <QuotationPDFViewer quotation={quote} />
                </DialogContent>
              </Dialog>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}