// src/components/quotation/QuotationHistoryPanel.tsx
"use client";

import { mockQuotationHistory } from "@/mock/mockQuotationHistory";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FileTextIcon } from "lucide-react";

export function QuotationHistoryPanel({ inquiryId }: { inquiryId: string }) {
  const history = mockQuotationHistory.filter((q) => q.inquiryId === inquiryId);

  if (history.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No past quotations yet.
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
                <div className="font-medium text-sm">
                  {quote.referenceNumber}
                </div>
                <div className="text-xs text-muted-foreground">
                  Issued: {new Date(quote.dateIssued).toLocaleString()}
                </div>
              </div>
              <Button
                variant="ghost"
                className="text-sm px-2 h-auto"
                onClick={() => {
                  // TODO: implement re-download or preview logic
                }}
              >
                <FileTextIcon className="w-4 h-4 mr-1" /> PDF
              </Button>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}