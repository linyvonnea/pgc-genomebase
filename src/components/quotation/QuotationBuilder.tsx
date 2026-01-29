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
import {
  User,
  Building2,
  Mail,
  FileText,
  Hash,
  Settings2,
  ChevronRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

  // Debug: Log catalog descriptions
  useEffect(() => {
    if (catalog.length > 0) {
      console.log('Catalog loaded:', catalog.length, 'services');
    }
  }, [catalog]);

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

  // Reference number is edited as a whole in one input

  // Merge fresh catalog data (with descriptions) into selected services
  useEffect(() => {
    if (catalog.length > 0 && selectedServices.length > 0) {
      setSelectedServices((prev) =>
        prev.map((service) => {
          const freshService = catalog.find((cat) => cat.id === service.id);
          if (freshService && freshService.description && !service.description) {
            console.log('Merging description for:', service.name, 'Description:', freshService.description);
            return { ...service, description: freshService.description };
          }
          return service;
        })
      );
    }
  }, [catalog]);

  const currentYear = new Date().getFullYear();

  const toggleService = (id: string, service: ServiceItem) => {
    console.log('Adding service:', service.name, 'Description:', service.description);
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.id === id);
      if (exists) return prev.filter((s) => s.id !== id);
      const newService = { ...service, quantity: 1, samples: 0, description: service.description };
      console.log('New service object:', newService);
      return [...prev, newService];
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

  // Update the subtotal calculation to use samples or participants based on service type
  const subtotal = cleanedServices.reduce((sum, item) => {
    const serviceType = item.type.toLowerCase();

    if (serviceType.includes('bioinformatics') || serviceType.includes('bioinfo')) {
      // Use samples for bioinformatics
      const samples = (item as any).samples ?? 1;
      const samplesAmount = calculateItemTotal(samples, item.price, {
        minQuantity: (item as any).minQuantity,
        additionalUnitPrice: (item as any).additionalUnitPrice,
      });
      return sum + (samplesAmount * item.quantity);
    } else if (serviceType.includes('training')) {
      // Use participants for training
      const participants = (item as any).participants ?? 1;
      const participantsAmount = calculateItemTotal(participants, item.price, {
        minQuantity: (item as any).minParticipants,
        additionalUnitPrice: (item as any).additionalParticipantPrice,
      });
      return sum + (participantsAmount * item.quantity);
    } else {
      // Default calculation
      return sum + (item.price * item.quantity);
    }
  }, 0);
  const discount = isInternal ? subtotal * 0.12 : 0;
  const total = subtotal - discount;

  const groupedByType = useMemo(() => {
    const result: Record<string, ServiceItem[]> = {};
    const selectedIds = new Set(selectedServices.map(s => s.id));

    for (const item of catalog) {
      // Filter by search
      const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
      // Filter by selected if showSelectedOnly is true
      const matchesFilter = !showSelectedOnly || selectedIds.has(item.id);

      if (matchesSearch && matchesFilter) {
        if (!result[item.type]) result[item.type] = [];
        result[item.type].push(item);
      }
    }
    return result;
  }, [search, catalog, showSelectedOnly, selectedServices]);

  const renderTable = (services: ServiceItem[], serviceType: string) => {
    const normalizedType = serviceType.toLowerCase();
    const isBioinformatics = normalizedType === "bioinformatics";
    const isTraining = normalizedType === "training";

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px] font-semibold">✔</TableHead>
            <TableHead className="min-w-[250px] font-semibold">Service</TableHead>
            <TableHead className="w-[100px] font-semibold">Unit</TableHead>
            <TableHead className="w-[100px] text-right font-semibold">Price</TableHead>
            <TableHead className="w-[120px]">
              <span className={isTraining ? "font-semibold" : "font-normal"}>Participants</span>
            </TableHead>
            <TableHead className="w-[150px] font-semibold">Qty</TableHead>
            <TableHead className="w-[120px] text-right font-semibold">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map((item) => {
            const isSelected = selectedServices.find((s) => s.id === item.id);
            const samples = (isSelected as any)?.samples ?? "";
            const participants = (isSelected as any)?.participants ?? "";
            const quantity = isSelected?.quantity ?? "";
            const price = isSelected?.price ?? 0;

            // Calculate amount based on service type
            let amount = 0;
            if (isSelected && typeof quantity === "number") {
              if (isBioinformatics && typeof samples === "number") {
                const samplesAmount = calculateItemTotal(samples, price, {
                  minQuantity: (item as any).minQuantity,
                  additionalUnitPrice: (item as any).additionalUnitPrice,
                });
                amount = samplesAmount * quantity;
              } else if (isTraining && typeof participants === "number") {
                const participantsAmount = calculateItemTotal(participants, price, {
                  minQuantity: (item as any).minParticipants,
                  additionalUnitPrice: (item as any).additionalParticipantPrice,
                });
                amount = participantsAmount * quantity;
              } else {
                amount = price * quantity;
              }
            }

            return (
              <TableRow key={item.id}>
                <TableCell>
                  <Checkbox
                    checked={!!isSelected}
                    onCheckedChange={() => toggleService(item.id, item)}
                  />
                </TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.unit}</TableCell>
                <TableCell className="text-right">
                  {item.price.toFixed(2)}
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    value={participants}
                    onChange={(e) =>
                      updateParticipants(
                        item.id,
                        e.target.value === "" ? "" : +e.target.value
                      )
                    }
                    disabled={!isSelected || !isTraining}
                    placeholder={isTraining ? "0" : "—"}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    value={quantity}
                    onChange={(e) =>
                      updateQuantity(
                        item.id,
                        e.target.value === "" ? "" : +e.target.value
                      )
                    }
                    disabled={!isSelected}
                  />
                </TableCell>
                <TableCell className="text-right">{amount.toFixed(2)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

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

      // Ensure admin info is available before saving
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

      // Invalidate quotation history to refresh the list
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
        {/* Premium Super-Compact Configuration Bar */}
        <div className="bg-white border rounded-xl shadow-sm mb-6 divide-y overflow-hidden">
          {/* Top Bar: Primary Identity & Ref */}
          <div className="bg-slate-50/80 px-4 py-2 flex items-center justify-between gap-6">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="p-1.5 bg-blue-600 text-white rounded-lg shadow-sm">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest leading-none mb-1">
                  Drafting Quotation
                </p>
                <h1 className="text-sm font-bold text-slate-900 truncate flex items-center gap-2">
                  {clientInfo.name || "Unnamed Client"}
                  {isInternal && (
                    <Badge className="h-4 px-1 bg-green-100 text-green-700 hover:bg-green-100 border-none text-[9px] font-black uppercase">
                      Internal
                    </Badge>
                  )}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="flex items-center gap-2 bg-white border rounded-md px-2 py-1 shadow-sm">
                <Hash className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Ref:</span>
                <input
                  value={referenceNumber}
                  onChange={e => setReferenceNumber(e.target.value)}
                  className="w-32 bg-transparent text-xs font-mono font-bold focus:outline-none border-none p-0 h-auto"
                  placeholder="REF-000"
                />
              </div>

              <div className="flex items-center gap-2 pr-2">
                <Checkbox
                  id="internal-toggle"
                  checked={isInternal}
                  onCheckedChange={(val: boolean) => setIsInternal(!!val)}
                  className="w-4 h-4 rounded-full border-slate-300 data-[state=checked]:bg-blue-600"
                />
                <Label htmlFor="internal-toggle" className="text-[11px] font-bold text-slate-600 cursor-pointer whitespace-nowrap">
                  Apply Internal Rate
                </Label>
              </div>
            </div>
          </div>

          {/* Bottom Bar: Multi-Column Editable Details */}
          <div className="px-4 py-2.5 grid grid-cols-2 lg:grid-cols-4 gap-4 items-center">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter flex items-center gap-1">
                <User className="w-2.5 h-2.5" /> Full Name
              </label>
              <input
                value={clientInfo.name}
                onChange={e => setClientInfo({ ...clientInfo, name: e.target.value })}
                className="w-full text-xs font-medium focus:ring-0 focus:outline-none bg-transparent p-0 border-none h-4 text-slate-700"
                placeholder="Client Name"
              />
            </div>

            <div className="space-y-1 border-l pl-4">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter flex items-center gap-1">
                <Building2 className="w-2.5 h-2.5" /> Institution/Affiliation
              </label>
              <input
                value={clientInfo.institution}
                onChange={e => setClientInfo({ ...clientInfo, institution: e.target.value })}
                className="w-full text-xs font-medium focus:ring-0 focus:outline-none bg-transparent p-0 border-none h-4 text-slate-700"
                placeholder="Institution"
              />
            </div>

            <div className="space-y-1 border-l pl-4">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter flex items-center gap-1">
                <ChevronRight className="w-2.5 h-2.5" /> Designation
              </label>
              <input
                value={clientInfo.designation}
                onChange={e => setClientInfo({ ...clientInfo, designation: e.target.value })}
                className="w-full text-xs font-medium focus:ring-0 focus:outline-none bg-transparent p-0 border-none h-4 text-slate-700"
                placeholder="Designation"
              />
            </div>

            <div className="space-y-1 border-l pl-4">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter flex items-center gap-1">
                <Mail className="w-2.5 h-2.5" /> Email Address
              </label>
              <input
                value={clientInfo.email}
                onChange={e => setClientInfo({ ...clientInfo, email: e.target.value })}
                className="w-full text-xs font-medium focus:ring-0 focus:outline-none bg-transparent p-0 border-none h-4 text-slate-700"
                placeholder="Email Address"
              />
            </div>
          </div>
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
                  const samples = (item as any).samples ?? 1;
                  const samplesAmount = calculateItemTotal(samples, item.price, {
                    minQuantity: (item as any).minQuantity,
                    additionalUnitPrice: (item as any).additionalUnitPrice,
                  });
                  const totalAmount = samplesAmount * item.quantity;
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
              <span>Applied 12% Discount:</span>
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
          <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
            <DialogHeader className="px-6 pt-6">
              <DialogTitle>Preview Quotation PDF</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-hidden px-6 pb-6">
              <PDFViewer width="100%" height="100%" className="border rounded">
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
            </div>
            <div className="px-6 pb-6 pt-4 border-t">
              <div className="text-right">
                <Button
                  onClick={handleSaveAndDownload}
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