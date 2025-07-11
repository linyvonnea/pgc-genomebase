// src/components/charge-slip/ChargeSlipHistoryPanel.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { getChargeSlipsByProjectId } from "@/services/chargeSlipService";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ChargeSlipPDFViewer } from "@/components/charge-slip/ChargeSlipPDFViewer";
import { ChargeSlipRecord } from "@/types/ChargeSlipRecord";

export function ChargeSlipHistoryPanel({ projectId }: { projectId: string }) {
  const { data: history = [], isLoading, error } = useQuery({
    queryKey: ["chargeSlipHistory", projectId],
    queryFn: () => getChargeSlipsByProjectId(projectId),
    enabled: !!projectId,
  });

  if (error) {
    return <div className="text-red-500 text-sm">Failed to load charge slip history.</div>;
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading history...</div>;
  }

  if (history.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No past charge slips yet for this project.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold">Charge Slip History</h4>
      <ScrollArea className="max-h-80 pr-2">
        <div className="space-y-3">
          {history.map((slip: ChargeSlipRecord, index: number) => (
            <Card key={index} className="p-3 border flex justify-between items-start">
              <div>
                <div className="font-medium text-sm">{slip.chargeSlipNumber}</div>
                <div className="text-xs text-muted-foreground">
                  Issued: {new Date(slip.dateIssued).toLocaleString()}
                </div>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" className="text-sm px-2 h-auto">
                    View PDF
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl h-[90vh] overflow-hidden">
                  <DialogHeader>
                    <DialogTitle>{slip.chargeSlipNumber}</DialogTitle>
                  </DialogHeader>
                  <ChargeSlipPDFViewer chargeSlip={slip} />
                </DialogContent>
              </Dialog>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
