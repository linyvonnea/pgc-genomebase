"use client";

import { Label } from "@/components/ui/label";
import { ChargeSlipHistoryPanel } from "./ChargeSlipHistoryPanel";
import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { pdf, PDFViewer } from "@react-pdf/renderer";
import { Timestamp } from "firebase/firestore";
import { toast } from "sonner";
import { ChargeSlipRecord } from "@/types/ChargeSlipRecord";
import { sanitizeObject } from "@/lib/sanitizeObject";
import { calculateItemTotal } from "@/lib/calculatePrice";
import { getServiceCatalog } from "@/services/serviceCatalogService";
import {
  getClientById,
  getProjectById,
} from "@/services/clientProjectService";
import {
  generateNextChargeSlipNumber,
  saveChargeSlip,
} from "@/services/chargeSlipService";

import { SelectedService as StrictSelectedService } from "@/types/SelectedService";
import { ServiceItem } from "@/types/ServiceItem";

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

import { ChargeSlipPDF } from "./ChargeSlipPDF";
import useAuth from "@/hooks/useAuth";
import { GroupedServiceSelector } from "@/components/forms/GroupedServiceSelector";

export type EditableSelectedService = Omit<StrictSelectedService, "quantity"> & {
  quantity: number | "";
  samples?: number | "";
  participants?: number | "";
};

export default function ChargeSlipBuilder({
  clientId,
  projectId,
  clientData,
  projectData,
  onSubmit,
}: {
  clientId?: string;
  projectId?: string;
  clientData?: any;
  projectData?: any;
  onSubmit: (data: any) => void;
}) {
  const [selectedServices, setSelectedServices] = useState<EditableSelectedService[]>([]);
  const [isInternal, setIsInternal] = useState(false);
  const [useAffiliationAsClientName, setUseAffiliationAsClientName] = useState(false);
  const [openPreview, setOpenPreview] = useState(false);
  const [search, setSearch] = useState("");
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [chargeSlipNumber, setChargeSlipNumber] = useState<string>("");
  const [orNumber, setOrNumber] = useState<string>("");

  const { adminInfo } = useAuth();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const effectiveClientId = clientId || searchParams.get("clientId") || "";
  const urlProjectId = projectId || searchParams.get("projectId") || "";

  const { data: catalog = [] } = useQuery({
    queryKey: ["serviceCatalog"],
    queryFn: getServiceCatalog,
  });

  const { data: fetchedClient } = useQuery({
    queryKey: ["client", effectiveClientId],
    queryFn: () => getClientById(effectiveClientId),
    enabled: !!effectiveClientId,
  });

  // Use primary project (first pid) if no specific projectId provided
  const client = sanitizeObject(clientData || fetchedClient || {});
  
  // Get the effective project ID - prioritize URL param, then primary project from client's pid array
  let effectiveProjectId = urlProjectId;
  
  // If projectId from URL contains comma-separated values, use only the first one (primary)
  if (effectiveProjectId && effectiveProjectId.includes(',')) {
    effectiveProjectId = effectiveProjectId.split(',')[0].trim();
    console.log("Multiple PIDs detected in URL, using primary:", effectiveProjectId);
  }
  
  // If still no projectId, get from client's primary pid
  if (!effectiveProjectId && client && Array.isArray(client.pid) && client.pid.length > 0) {
    effectiveProjectId = client.pid[0];
    console.log("Using primary project ID from client:", effectiveProjectId);
  }

  const { data: fetchedProject, isLoading: isProjectLoading } = useQuery({
    queryKey: ["project", effectiveProjectId],
    queryFn: () => getProjectById(effectiveProjectId!),
    enabled: !!effectiveProjectId,
  });

  const project = projectData || fetchedProject || null;

  // Log warning if client data is missing
  useEffect(() => {
    if (effectiveClientId && !client?.name) {
      console.warn(`Client data not found or incomplete for CID: ${effectiveClientId}`);
    }
  }, [effectiveClientId, client]);

  useEffect(() => {
    const fetchRef = async () => {
      const year = new Date().getFullYear();
      const next = await generateNextChargeSlipNumber(year);
      setChargeSlipNumber(next);
    };
    fetchRef();
  }, []);

  const toggleService = (id: string, service: ServiceItem) => {
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.id === id);
      if (exists) return prev.filter((s) => s.id !== id);
      return [...prev, { 
        ...service, 
        quantity: 1, 
        samples: 0,
        participants: 0,
        description: service.description // Preserve description from catalog
      }];
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
    // Default calculation for other services
    return sum + (item.price * item.quantity);
  }
}, 0);
  const discount = isInternal ? subtotal * 0.12 : 0;
  const total = subtotal - discount;

  const clientInfo = {
    name: client?.name || "Unknown Client",
    institution: client?.affiliation || "No Institution",
    designation: client?.designation || "No Designation",
    email: client?.email || "",
  };

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

  const normalizeCategory = (raw: string): string => {
    const lower = raw.toLowerCase();
    if (lower.includes("equipment")) return "equipment";
    if (lower.includes("lab")) return "laboratory";
    if (lower.includes("bioinformatics") || lower.includes("bioinfo")) return "bioinformatics";
    if (lower.includes("retail")) return "retail";
    if (lower.includes("training")) return "training";
    return lower; // fallback
  };
  const handleSaveAndDownload = async () => {
    try {
      const rawRecord = {
        id: chargeSlipNumber,
        chargeSlipNumber,
        cid: client?.cid || effectiveClientId,
        projectId: effectiveProjectId,
        client,
        project,
        services: cleanedServices,
        orNumber,
        useInternalPrice: isInternal,
        useAffiliationAsClientName,
        preparedBy: {
          name: adminInfo?.name || "—",
          position: adminInfo?.position || "—",
        },
        approvedBy: {
          name: "VICTOR MARCO EMMANUEL N. FERRIOLS, Ph.D",
          position: "AED, PGC Visayas",
        },
        referenceNumber: chargeSlipNumber,
        clientInfo,
        dateIssued: Timestamp.fromDate(new Date()),
        subtotal,
        discount,
        total,
        
        categories: Array.from(new Set(cleanedServices.map((s) => normalizeCategory(s.category)))),
      };

      const record = sanitizeObject(rawRecord) as ChargeSlipRecord;

      // Save to Firestore first
      await saveChargeSlip(record);

      // Generate PDF after save completes
      const blob = await pdf(
        <ChargeSlipPDF
          services={cleanedServices}
          client={client}
          project={project}
          chargeSlipNumber={chargeSlipNumber}
          useAffiliationAsClientName={useAffiliationAsClientName}
          orNumber={orNumber}
          useInternalPrice={isInternal}
          preparedBy={record.preparedBy}
          approvedBy={record.approvedBy}
          referenceNumber={chargeSlipNumber}
          clientInfo={clientInfo}
          dateIssued={new Date().toISOString()}
          subtotal={subtotal}
          discount={discount}
          total={total}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${chargeSlipNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      
      // Invalidate charge slip history to refresh the list
      queryClient.invalidateQueries({ queryKey: ["chargeSlipHistory", effectiveProjectId] });
      
      toast.success("Charge slip saved and downloaded successfully!");
      onSubmit?.(record);
    } catch (error) {
      console.error("Failed to save charge slip:", error);
      toast.error(`Failed to save charge slip: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="p-6 flex gap-6">
      {/* Left Column */}
      <div className="flex-[2] min-w-[520px]">
        <div className="mb-6">
          <h1 className="text-xl font-semibold mb-2">Build Charge Slip for:</h1>
          <Accordion type="single" collapsible defaultValue="">
            <AccordionItem value="client-info" className="border rounded-lg overflow-hidden shadow-sm">
              <AccordionTrigger className="px-4 py-3 hover:no-underline bg-white text-base font-semibold">
                Client Information
              </AccordionTrigger>
              <AccordionContent className="px-0 pb-0">
                <div className="pl-6 pr-4 pb-3">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr>
                        <td className="py-1 pr-4 text-muted-foreground w-40">Charge Slip Number</td>
                        <td><Input placeholder="Charge Slip Number" value={chargeSlipNumber} onChange={e => setChargeSlipNumber(e.target.value)} /></td>
                      </tr>
                      <tr>
                        <td className="py-1 pr-4 text-muted-foreground">Client Name</td>
                        <td><Input placeholder="Client Name" value={clientInfo.name} onChange={e => setClientInfo({ ...clientInfo, name: e.target.value })} /></td>
                      </tr>
                      <tr>
                        <td className="py-1 pr-4 text-muted-foreground">Institution</td>
                        <td><Input placeholder="Institution" value={clientInfo.institution} onChange={e => setClientInfo({ ...clientInfo, institution: e.target.value })} /></td>
                      </tr>
                      <tr>
                        <td className="py-1 pr-4 text-muted-foreground">Designation</td>
                        <td><Input placeholder="Designation" value={clientInfo.designation} onChange={e => setClientInfo({ ...clientInfo, designation: e.target.value })} /></td>
                      </tr>
                      <tr>
                        <td className="py-1 pr-4 text-muted-foreground">Email</td>
                        <td><Input placeholder="Email" value={clientInfo.email} onChange={e => setClientInfo({ ...clientInfo, email: e.target.value })} /></td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="flex items-center gap-2 pt-2">
                    <Checkbox
                      checked={useAffiliationAsClientName}
                      onCheckedChange={val => setUseAffiliationAsClientName(!!val)}
                    />
                    <span className="text-sm">Display affiliation as client name in PDF</span>
                  </div>
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

        <div className="mb-4">
          <Label htmlFor="orNumber">OR Number</Label>
          <Input
            id="orNumber"
            placeholder="Enter OR Number"
            value={orNumber}
            onChange={(e) => setOrNumber(e.target.value)}
          />
        </div>

        <div className="flex gap-2 mb-4 items-center">
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

      {/* Right Summary Column */}
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
                const category = item.category;
                if (!acc[category]) acc[category] = [];
                acc[category].push(item);
                return acc;
              }, {} as Record<string, typeof cleanedServices>)
            ).map(([category, items]) => (
              <div key={category} className="mb-3">
                <p className="text-xs font-semibold text-gray-600 uppercase mb-1">
                  {category} ({items.length})
                </p>
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm mb-1 pl-2">
                    <span className="truncate">
                      {item.name} x {item.quantity}
                    </span>
                    <span className="font-medium">₱{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
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
              Preview Charge Slip
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Preview Charge Slip PDF</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <PDFViewer width="100%" height="600">
                <ChargeSlipPDF
                  services={cleanedServices}
                  client={client}
                  project={project}
                  chargeSlipNumber={chargeSlipNumber}
                  orNumber={orNumber}
                  useInternalPrice={isInternal}
                  useAffiliationAsClientName={useAffiliationAsClientName}
                  preparedBy={{
                    name: adminInfo?.name || "—",
                    position: adminInfo?.position || "—",
                  }}
                  approvedBy={{
                    name: "VICTOR MARCO EMMANUEL N. FERRIOLS, Ph.D",
                    position: "AED, PGC Visayas",
                  }}
                  referenceNumber={chargeSlipNumber}
                  clientInfo={clientInfo}
                  dateIssued={new Date().toISOString()}
                  subtotal={subtotal}
                  discount={discount}
                  total={total}
                />
              </PDFViewer>
              <div className="text-right mt-4">
                <Button 
                  onClick={handleSaveAndDownload}
                  disabled={cleanedServices.length === 0}
                >
                  Generate Final Charge Slip
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Separator className="my-6" />
        <ChargeSlipHistoryPanel projectId={effectiveProjectId} />
      </div>
    </div>
  );
}