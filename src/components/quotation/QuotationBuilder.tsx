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
  ChevronRight,
  Receipt,
  CreditCard,
  History,
  TrendingDown,
  Info
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
                <span className="text-xs font-mono font-bold text-slate-700 min-w-[120px]">
                  {referenceNumber}
                </span>
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

          {/* Bottom Bar: Multi-Column Display Details */}
          <div className="px-4 py-2.5 grid grid-cols-2 lg:grid-cols-4 gap-4 items-center">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter flex items-center gap-1">
                <User className="w-2.5 h-2.5" /> Full Name
              </label>
              <div className="text-xs font-semibold text-slate-700 h-4 border-none py-0">
                {clientInfo.name}
              </div>
            </div>

            <div className="space-y-1 border-l pl-4">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter flex items-center gap-1">
                <Building2 className="w-2.5 h-2.5" /> Institution/Affiliation
              </label>
              <div className="text-xs font-semibold text-slate-700 h-4 border-none py-0 truncate" title={clientInfo.institution}>
                {clientInfo.institution}
              </div>
            </div>

            <div className="space-y-1 border-l pl-4">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter flex items-center gap-1">
                <ChevronRight className="w-2.5 h-2.5" /> Designation
              </label>
              <div className="text-xs font-semibold text-slate-700 h-4 border-none py-0 truncate" title={clientInfo.designation}>
                {clientInfo.designation}
              </div>
            </div>

            <div className="space-y-1 border-l pl-4">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter flex items-center gap-1">
                <Mail className="w-2.5 h-2.5" /> Email Address
              </label>
              <div className="text-xs font-semibold text-slate-700 h-4 border-none py-0 truncate" title={clientInfo.email}>
                {clientInfo.email || "N/A"}
              </div>
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

      <div className="flex-[1] min-w-[320px] max-w-[420px] shrink-0 sticky top-6 h-fit bg-slate-50/30 border rounded-xl shadow-lg flex flex-col overflow-hidden">
        {/* Summary Header */}
        <div className="bg-slate-900 text-white p-5">
          <div className="flex items-center gap-2 mb-1">
            <Receipt className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em]">Live Summary</h3>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {cleanedServices.length} {cleanedServices.length === 1 ? 'service' : 'services'} ready for export
          </p>
        </div>

        <div className="p-5 flex-1 space-y-6">
          {cleanedServices.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-lg bg-white border border-dashed border-slate-200">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Info className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Empty Selection</p>
              <p className="text-[11px] text-slate-400 mt-1">Select services from the catalog to build your quotation.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[40vh] -mx-1 px-1">
              <div className="space-y-4">
                {Object.entries(
                  cleanedServices.reduce((acc, item) => {
                    const category = item.type || 'Other';
                    if (!acc[category]) acc[category] = [];
                    acc[category].push(item);
                    return acc;
                  }, {} as Record<string, typeof cleanedServices>)
                ).map(([category, items]) => (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-[1px] flex-1 bg-slate-100"></div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">
                        {category}
                      </span>
                      <div className="h-[1px] flex-1 bg-slate-100"></div>
                    </div>
                    {items.map((item) => {
                      const participants = (item as any).participants ?? 1;
                      const baseAmount = calculateItemTotal(participants, item.price, {
                        minQuantity: (item as any).minParticipants || (item as any).minQuantity,
                        additionalUnitPrice: (item as any).additionalParticipantPrice || (item as any).additionalUnitPrice,
                      });
                      const subtotalItem = baseAmount * item.quantity;

                      return (
                        <div key={item.id} className="flex flex-col gap-0.5 pl-1 pr-1 py-1 rounded hover:bg-slate-50 transition-colors">
                          <div className="flex justify-between items-start gap-3">
                            <span className="text-xs font-bold text-slate-700 leading-tight">
                              {item.name}
                            </span>
                            <span className="text-xs font-bold text-slate-900 tabular-nums shrink-0">
                              ₱{subtotalItem.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] font-medium text-slate-400">
                            <span>{item.quantity} unit{item.quantity !== 1 ? 's' : ''} × {item.unit}</span>
                            {isInternal && <span className="text-[9px] text-green-600 font-bold uppercase">Incl Discount</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Pricing Totals Card */}
          <div className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
            <div className="space-y-2 pb-3 border-b border-slate-50">
              <div className="flex justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                <span>Gross Subtotal</span>
                <span className="tabular-nums text-slate-700">₱{subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              {isInternal && (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter">
                    <TrendingDown className="w-3 h-3" /> 12% Internal
                  </div>
                  <span className="text-[11px] font-bold text-green-700 tabular-nums">-₱{discount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-end pt-1">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">
                  Proposed Total
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-bold text-slate-400">PHP</span>
                  <span className="text-2xl font-black text-slate-900 tabular-nums tracking-tighter">
                    {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              <CreditCard className="w-8 h-8 text-slate-100 mb-1" />
            </div>

            <Dialog open={openPreview} onOpenChange={setOpenPreview}>
              <DialogTrigger asChild>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest h-11 shadow-md shadow-blue-100 transition-all active:scale-[0.98]"
                  disabled={cleanedServices.length === 0}
                >
                  Confirm & Review
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 border-none shadow-2xl bg-slate-900">
                <DialogHeader className="px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
                  <div className="flex justify-between items-center">
                    <div>
                      <DialogTitle className="text-lg font-black uppercase tracking-widest text-blue-400">Quotation Preview</DialogTitle>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Reference: {referenceNumber}</p>
                    </div>
                  </div>
                </DialogHeader>
                <div className="flex-1 bg-slate-800/50 p-6 overflow-hidden">
                  <PDFViewer width="100%" height="100%" className="rounded-lg shadow-2xl">
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
                <div className="p-6 bg-slate-900 border-t border-slate-800">
                  <div className="flex justify-between items-center">
                    <div className="text-left">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Final Payable</p>
                      <p className="text-xl font-black text-white">₱{total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <Button
                      size="lg"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] px-12"
                      onClick={handleSaveAndDownload}
                      disabled={cleanedServices.length === 0}
                    >
                      Process & Transmit
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* History Section Integrated */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-3.5 h-3.5 text-slate-400" />
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Version History</h4>
            </div>
            <QuotationHistoryPanel inquiryId={effectiveInquiryId} />
          </div>
        </div>
      </div>
    </div>
  );
}