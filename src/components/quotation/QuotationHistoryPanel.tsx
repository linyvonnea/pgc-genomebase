// src/components/quotation/QuotationHistoryPanel.tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQuotationsByInquiryId, getQuotationsByClientName } from "@/services/quotationService";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { FileTextIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QuotationPDFViewer } from "./QuotationPDFViewer";
import { QuotationRecord } from "@/types/Quotation";

type QuotationHistoryPanelProps = {
  inquiryId?: string;
  clientName?: string;
  onSelectQuotation?: (quotation: QuotationRecord) => void;
  onDeselectQuotation?: (quotation: QuotationRecord) => void;
  showCheckboxes?: boolean;
};

export function QuotationHistoryPanel({ 
  inquiryId, 
  clientName, 
  onSelectQuotation,
  onDeselectQuotation,
  showCheckboxes = false 
}: QuotationHistoryPanelProps) {
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(null);
  
  const hasInquiryId = !!(inquiryId && inquiryId.trim().length > 0);
  const hasClientName = !!(clientName && clientName.trim().length > 0);
  const shouldFetch = hasInquiryId || hasClientName;
  
  // Prioritize inquiryId if available, otherwise use clientName
  const useInquiryId = hasInquiryId;
  
  const { data: history = [], isLoading, error, isFetched } = useQuery({
    queryKey: useInquiryId ? ["quotationHistory", "inquiry", inquiryId] : ["quotationHistory", "client", clientName],
    queryFn: () => {
      if (useInquiryId) {
        return getQuotationsByInquiryId(inquiryId!);
      } else if (hasClientName) {
        return getQuotationsByClientName(clientName);
      }
      return Promise.resolve([]);
    },
    enabled: shouldFetch,
  });

  if (error) {
    console.error(" [HistoryPanel] Error fetching quotation history:", error);
    return <div className="text-red-500 text-sm">Failed to load quotation history.</div>;
  }

  if (!shouldFetch) {
    return <div className="text-sm text-muted-foreground">No inquiry or client information available.</div>;
  }

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading history...</div>;

  if (history.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No past quotations yet for {useInquiryId ? <code>{inquiryId}</code> : <code>{clientName}</code>}.
      </div>
    );
  }

  const handleCheckboxChange = (quote: QuotationRecord, checked: boolean) => {
    if (checked) {
      setSelectedQuotationId(quote.referenceNumber);
      onSelectQuotation?.(quote);
    } else {
      setSelectedQuotationId(null);
      onDeselectQuotation?.(quote);
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold">
        Quotation History
        {showCheckboxes && <span className="text-xs text-muted-foreground ml-2">(Select to auto-populate services)</span>}
      </h4>
      <ScrollArea className="max-h-80 pr-2">
        <div className="space-y-3">
          {history.map((quote, index) => (
            <Card key={index} className="p-3 border flex justify-between items-start gap-3">
              {showCheckboxes && (
                <div className="flex items-start pt-1">
                  <Checkbox
                    checked={selectedQuotationId === quote.referenceNumber}
                    onCheckedChange={(checked) => handleCheckboxChange(quote, checked as boolean)}
                  />
                </div>
              )}
              <div className="flex-1">
                <div className="font-medium text-sm">{quote.referenceNumber}</div>
                <div className="text-xs text-muted-foreground">
                  Issued: {new Date(quote.dateIssued).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {quote.services.length} service{quote.services.length !== 1 ? 's' : ''}
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