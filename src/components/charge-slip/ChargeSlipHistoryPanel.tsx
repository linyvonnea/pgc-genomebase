"use client";

import { useQuery } from "@tanstack/react-query";
import { getChargeSlipsByProjectId } from "@/services/chargeSlipService";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { FileTextIcon } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";

import { ChargeSlipHistoryPDFPreview } from "./ChargeSlipHistoryPDFPreview";
import { Timestamp } from "firebase/firestore";

type ChargeSlipHistoryPanelProps = {
  projectId: string;
  clientId?: string;
};

export function ChargeSlipHistoryPanel({ projectId }: ChargeSlipHistoryPanelProps) {
  const {
    data: history = [],
    isLoading,
    error,
  } = useQuery({
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
        No past charge slips yet for <code>{projectId}</code>.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold">Charge Slip History</h4>
      <ScrollArea className="max-h-80 pr-2">
        <div className="space-y-3">
          {history.map((record, index) => {
            let issuedDate = "Unknown";

            if (record.dateIssued) {
              try {
                const date =
                  record.dateIssued instanceof Timestamp
                    ? record.dateIssued.toDate()
                    : new Date(record.dateIssued);
                issuedDate = date.toLocaleDateString(); // or .toLocaleString() for full datetime
              } catch (err) {
                console.error("Error parsing dateIssued:", err);
              }
            }

            return (
              <Card
                key={record.chargeSlipNumber ?? index}
                className="p-3 border flex justify-between items-start"
              >
                <div>
                  <div className="font-medium text-sm">{record.chargeSlipNumber}</div>
                  <div className="text-xs text-muted-foreground">Issued: {issuedDate}</div>
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" className="text-sm px-2 h-auto">
                      <FileTextIcon className="w-4 h-4 mr-1" />
                      PDF
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="max-w-4xl h-[90vh] p-0 flex flex-col">
                    <VisuallyHidden>
                      <DialogTitle>{record.chargeSlipNumber}</DialogTitle>
                    </VisuallyHidden>

                    <div className="px-6 pt-4 pb-2 border-b">
                      <h2 className="text-base font-semibold">
                        {record.chargeSlipNumber}
                      </h2>
                    </div>

                    <ChargeSlipHistoryPDFPreview record={record} />
                  </DialogContent>
                </Dialog>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}