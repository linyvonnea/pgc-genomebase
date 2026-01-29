// src/components/quotation/QuotationBuilder.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { pdf } from "@react-pdf/renderer";
import { toast } from "sonner";

import { calculateItemTotal } from "@/lib/calculatePrice";
import { sanitizeObject } from "@/lib/sanitizeObject";
import { getServiceCatalog } from "@/services/serviceCatalogService";
import { getInquiryById } from "@/services/inquiryService";
import { saveQuotationAction } from "@/app/actions/quotationActions";

import { QuotationRecord } from "@/types/Quotation";
import { SelectedService as StrictSelectedService } from "@/types/SelectedService";
import { ServiceItem } from "@/types/ServiceItem";
import { Inquiry } from "@/types/Inquiry";

import { saveQuotationToFirestore, generateNextReferenceNumber } from "@/services/quotationService";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { PDFViewer } from "@react-pdf/renderer";
import { QuotationPDF } from "./QuotationPDF";
import { QuotationHistoryPanel } from "./QuotationHistoryPanel";
import useAuth from "@/hooks/useAuth";
import { GroupedServiceSelector } from "@/components/forms/GroupedServiceSelector";

// Allow editable quantity ("" or number)
type EditableSelectedService = Omit<StrictSelectedService, "quantity"> & {
  quantity: number | "";
  samples?: number | "";
};

export default function QuotationBuilder({
  inquiryId,
  initialClientInfo,
}: {
  inquiryId?: string;
  initialClientInfo?: {
    name: string;
    institution: string;
    designation: string;
    email: string;
  };
}) {
  const [selectedServices, setSelectedServices] = useState<EditableSelectedService[]>([]);
  const [isInternal, setIsInternal] = useState(false);
  const [openPreview, setOpenPreview] = useState(false);
  const [search, setSearch] = useState("");
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [clientInfo, setClientInfo] = useState({
    name: "",
    institution: "",
    designation: "",
    email: "",
  });

  const { adminInfo } = useAuth();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const effectiveInquiryId = inquiryId || searchParams.get("inquiryId") || "";

  const { data: catalog = [] } = useQuery({
    queryKey: ["serviceCatalog"],
    queryFn: getServiceCatalog,
  });

  const { data: inquiryData } = useQuery<Inquiry | undefined>({
    queryKey: ["inquiry", effectiveInquiryId],
    queryFn: () => getInquiryById(effectiveInquiryId),
    enabled: !!effectiveInquiryId && !initialClientInfo,
  });

  // Sync clientInfo state with fetched inquiry data or initial props
  useEffect(() => {
    if (initialClientInfo) {
      setClientInfo(initialClientInfo);
    } else if (inquiryData) {
      setClientInfo({
        name: inquiryData.name || "Unknown",
        institution: inquiryData.affiliation || "N/A",
        designation: inquiryData.designation || "N/A",
        email: inquiryData.email || "",
      });
    }
  }, [initialClientInfo, inquiryData]);

  useEffect(() => {
    const fetchRef = async () => {
      const year = new Date().getFullYear();
      const next = await generateNextReferenceNumber(year);
      setReferenceNumber(next);
    };
    fetchRef();
  }, []);

  const currentYear = new Date().getFullYear();

  const toggleService = (id: string, service: ServiceItem) => {
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.id === id);
      if (exists) return prev.filter((s) => s.id !== id);
      return [...prev, { ...service, quantity: 1, samples: 0, description: service.description }];
    });
  };

  const updateQuantity = (id: string, qty: number | "") => {
    setSelectedServices((prev) =>
      prev.map((svc) => (svc.id === id ? { ...svc, quantity: qty } : svc))
    );
  };

  const updateSamples = (id: string, samples: number | "") => {
    setSelectedServices((prev) =>
      prev.map((svc) => (svc.id === id ? { ...svc, samples } : svc))
    );
  };

  const updateParticipants = (id: string, participants: number | "") => {
    setSelectedServices((prev) =>
      prev.map((svc) => (svc.id === id ? { ...svc, participants } : svc))
    );
  };

  const cleanedServices: StrictSelectedService[] = selectedServices
    .filter((s) => typeof s.quantity === "number" && s.quantity > 0)
    .map((s) => ({ ...s, quantity: s.quantity as number }));

  const subtotal = cleanedServices.reduce((sum, item) => {
    const serviceType = item.type.toLowerCase();

    if (serviceType.includes('bioinformatics') || serviceType.includes('bioinfo')) {
      const samples = (item as any).samples ?? 1;
      const samplesAmount = calculateItemTotal(samples, item.price, {
        minQuantity: (item as any).minQuantity,
        additionalUnitPrice: (item as any).additionalUnitPrice,
      });
      return sum + (samplesAmount * item.quantity);
    } else if (serviceType.includes('training')) {
      const participants = (item as any).participants ?? 1;
      const participantsAmount = calculateItemTotal(participants, item.price, {
        minQuantity: (item as any).minParticipants,
        additionalUnitPrice: (item as any).additionalParticipantPrice,
      });
      return sum + (participantsAmount * item.quantity);
    } else {
      return sum + (item.price * item.quantity);
    }
  }, 0);
  const discount = isInternal ? subtotal * 0.12 : 0;
  const total = subtotal - discount;

  const handleSaveAndDownload = async () => {
    try {
      const quotationRecord = {
        referenceNumber,
        name: clientInfo.name,
        institution: clientInfo.institution,
        designation: clientInfo.designation,
        email: clientInfo.email,
        services: cleanedServices,
        isInternal,
        dateIssued: new Date().toISOString(),
        year: currentYear,
        subtotal,
        discount,
        total,
        preparedBy: {
          name: adminInfo?.name || "—",
          position: adminInfo?.position || "—",
        },
        categories: Array.from(
          new Set(cleanedServices.map((s) => s.type))
        ),
        inquiryId: effectiveInquiryId.trim(),
      };

      if (!adminInfo?.email) {
        toast.error("User authentication required to save quotation");
        return;
      }

      const result = await saveQuotationAction(quotationRecord, {
        name: adminInfo.name || adminInfo.email!,
        email: adminInfo.email!
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to save quotation");
      }

      const blob = await pdf(
        <QuotationPDF
          services={cleanedServices}
          clientInfo={clientInfo}
          referenceNumber={referenceNumber}
          useInternalPrice={isInternal}
          preparedBy={{
            name: adminInfo?.name || "—",
            position: adminInfo?.position || "—",
          }}
          dateOfIssue={new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${referenceNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      queryClient.invalidateQueries({ queryKey: ["quotationHistory", effectiveInquiryId] });
      toast.success("Quotation saved and downloaded successfully!");
      setOpenPreview(false);
    } catch (error) {
      console.error("Error saving quotation:", error);
      toast.error(`Failed to save quotation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="p-6 flex gap-6">
      <div className="flex-[2] min-w-[520px]">
        <div className="mb-6">
          <h1 className="text-xl font-semibold mb-2">Build Quotation for:</h1>
          <Accordion type="single" collapsible defaultValue="client-info">
            <AccordionItem value="client-info" className="border rounded-lg overflow-hidden shadow-sm">
              <AccordionTrigger className="px-4 py-3 hover:no-underline bg-white text-base font-semibold">
                Client Information
              </AccordionTrigger>
              <AccordionContent className="px-0 pb-0">
                <div className="pl-6 pr-4 pb-3">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr>
                        <td className="py-2 pr-4 text-muted-foreground w-40">Reference Number</td>
                        <td className="py-2 font-mono font-bold text-slate-700">{referenceNumber}</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 text-muted-foreground">Client Name</td>
                        <td className="py-2 font-semibold text-slate-900">{clientInfo.name}</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 text-muted-foreground">Institution</td>
                        <td className="py-2 text-slate-700">{clientInfo.institution}</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 text-muted-foreground">Designation</td>
                        <td className="py-2 text-slate-700">{clientInfo.designation}</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 text-muted-foreground">Email</td>
                        <td className="py-2 text-slate-700">{clientInfo.email || "N/A"}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="flex items-center gap-2 pt-2">
                    <Checkbox
                      checked={isInternal}
                      onCheckedChange={val => setIsInternal(!!val)}
                    />
                    <span className="text-sm">Internal Client (Apply 12% discount)</span>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Search services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Button
            variant={showSelectedOnly ? "default" : "outline"}
            onClick={() => setShowSelectedOnly(!showSelectedOnly)}
            className="whitespace-nowrap"
          >
            {showSelectedOnly ? "Show All" : "Show Selected"}
            {selectedServices.length > 0 && (
              <span className="ml-2 bg-white text-primary rounded-full px-2 py-0.5 text-xs font-semibold">
                {selectedServices.length}
              </span>
            )}
          </Button>
        </div>

        <ScrollArea className="h-[65vh] pr-2 w-full">
          <div className="w-full">
            <GroupedServiceSelector
              catalog={catalog}
              selectedServices={selectedServices}
              search={search}
              showSelectedOnly={showSelectedOnly}
              onToggleService={toggleService}
              onUpdateQuantity={updateQuantity}
              onUpdateSamples={updateSamples}
              onUpdateParticipants={updateParticipants}
            />
          </div>
        </ScrollArea>
      </div>

      <div className="flex-[1] min-w-[320px] max-w-[420px] shrink-0 sticky top-6 h-fit border p-4 rounded-md shadow-sm bg-white">
        <h3 className="text-lg font-bold mb-2">Summary</h3>
        <p className="text-sm text-muted-foreground mb-2">
          {cleanedServices.length} {cleanedServices.length === 1 ? 'service' : 'services'} selected
        </p>
        <Separator className="mb-2" />
        {cleanedServices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No services selected</p>
            <p className="text-xs mt-1">Select services from the list to continue</p>
          </div>
        ) : (
          <>
            {Object.entries(
              cleanedServices.reduce((acc, item) => {
                const category = item.type || 'Other';
                if (!acc[category]) acc[category] = [];
                acc[category].push(item);
                return acc;
              }, {} as Record<string, typeof cleanedServices>)
            ).map(([category, items]) => (
              <div key={category} className="mb-3">
                <p className="text-xs font-semibold text-gray-600 uppercase mb-1">
                  {category} ({items.length})
                </p>
                {items.map((item) => {
                  const participants = (item as any).participants ?? 1;
                  const baseAmount = calculateItemTotal(participants, item.price, {
                    minQuantity: (item as any).minParticipants || (item as any).minQuantity,
                    additionalUnitPrice: (item as any).additionalParticipantPrice || (item as any).additionalUnitPrice,
                  });
                  const totalAmount = baseAmount * item.quantity;
                  return (
                    <div key={item.id} className="flex justify-between text-sm mb-1 pl-2">
                      <span className="truncate">
                        {item.name} x {item.quantity}
                      </span>
                      <span className="font-medium">₱{totalAmount.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </>
        )}
        <Separator className="my-2" />
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>₱{subtotal.toFixed(2)}</span>
          </div>
          {isInternal && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount (12%):</span>
              <span>-₱{discount.toFixed(2)}</span>
            </div>
          )}
        </div>
        <Separator className="my-2" />
        <div className="flex justify-between text-lg font-bold text-primary">
          <span>Total:</span>
          <span>₱{total.toFixed(2)}</span>
        </div>

        <Dialog open={openPreview} onOpenChange={setOpenPreview}>
          <DialogTrigger asChild>
            <Button
              className="mt-4 w-full"
              disabled={cleanedServices.length === 0}
            >
              Preview Quotation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Preview Quotation PDF</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <PDFViewer width="100%" height="600">
                <QuotationPDF
                  services={cleanedServices}
                  clientInfo={clientInfo}
                  referenceNumber={referenceNumber}
                  useInternalPrice={isInternal}
                  preparedBy={{
                    name: adminInfo?.name || "—",
                    position: adminInfo?.position || "—",
                  }}
                  dateOfIssue={new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                />
              </PDFViewer>
              <div className="text-right mt-4">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest h-11 shadow-md shadow-blue-100 transition-all active:scale-[0.98]"
                  disabled={cleanedServices.length === 0}
                >
                  Generate Final Quotation
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Separator className="my-6" />
        <QuotationHistoryPanel inquiryId={effectiveInquiryId} />
      </div>
    </div>
  );
}