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

export type EditableSelectedService = Omit<StrictSelectedService, "quantity"> & {
  quantity: number | "";
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
  const [chargeSlipNumber, setChargeSlipNumber] = useState<string>("");
  const [orNumber, setOrNumber] = useState<string>("");

  const { adminInfo } = useAuth();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const effectiveClientId = clientId || searchParams.get("clientId") || "";
  const effectiveProjectId = projectId || searchParams.get("projectId") || "";

  const { data: catalog = [] } = useQuery({
    queryKey: ["serviceCatalog"],
    queryFn: getServiceCatalog,
  });

  const { data: fetchedClient } = useQuery({
    queryKey: ["client", effectiveClientId],
    queryFn: () => getClientById(effectiveClientId),
    enabled: !!effectiveClientId,
  });

  const { data: fetchedProject } = useQuery({
    queryKey: ["project", effectiveProjectId],
    queryFn: () => getProjectById(effectiveProjectId),
    enabled: !!effectiveProjectId,
  });

  const client = sanitizeObject(clientData || fetchedClient || {});
  const project = sanitizeObject(projectData || fetchedProject || {});

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
  const cleanedServices: StrictSelectedService[] = selectedServices
    .filter((s) => typeof s.quantity === "number" && s.quantity > 0)
    .map((s) => ({ ...s, quantity: s.quantity as number }));

    // Update the subtotal calculation to use samples
const subtotal = cleanedServices.reduce((sum, item) => {
  const samples = (item as any).samples ?? 1;
  const samplesAmount = calculateItemTotal(samples, item.price, {
    minQuantity: (item as any).minQuantity,
    additionalUnitPrice: (item as any).additionalUnitPrice,
  });
  return sum + (samplesAmount * item.quantity);
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
    for (const item of catalog) {
      if (!search || item.name.toLowerCase().includes(search.toLowerCase())) {
        if (!result[item.type]) result[item.type] = [];
        result[item.type].push(item);
      }
    }
    return result;
  }, [search, catalog]);

  const renderTable = (services: ServiceItem[], serviceType: string) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>✔</TableHead>
          <TableHead>Service</TableHead>
          <TableHead>Unit</TableHead>
          <TableHead>Price</TableHead>
          {serviceType === "bioinformatics" && <TableHead>Samples</TableHead>}
          {serviceType === "training" && <TableHead>No. of Participants</TableHead>}
          <TableHead>Qty</TableHead>
          <TableHead>Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {services.map((item) => {
          const isSelected = selectedServices.find((s) => s.id === item.id);
          const samples = (isSelected as any)?.samples ?? "";
          const quantity = isSelected?.quantity ?? "";
          const price = isSelected?.price ?? 0;

          // Calculate amount based on samples with tiered pricing
          const amount =
            isSelected && typeof samples === "number" && typeof quantity === "number"
              ? calculateItemTotal(samples, price, {
                  minQuantity: (item as any).minQuantity,
                  additionalUnitPrice: (item as any).additionalUnitPrice,
                }) * quantity
              : 0;

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
            {serviceType === "bioinformatics" && (
            <TableCell>
              <Input
                type="number"
                min={0}
                value={samples}
                onChange={(e) =>
                  updateSamples(
                    item.id,
                    e.target.value === "" ? "" : +e.target.value
                  )
                }
                disabled={!isSelected}
                placeholder="0"
              />
            </TableCell>
            )}
            {serviceType === "training" && (
            <TableCell>
              <Input
                type="number"
                min={0}
                value={samples}
                onChange={(e) =>
                  updateSamples(
                    item.id,
                    e.target.value === "" ? "" : +e.target.value
                  )
                }
                disabled={!isSelected}
                placeholder="0"
              />
            </TableCell>
            )}
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
            <TableCell>{amount.toFixed(2)}</TableCell>
          </TableRow>
        );
      })}
    </TableBody>
  </Table>
);

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
      <div className="flex-1">
        <div className="mb-6">
          <h1 className="text-xl font-semibold mb-1">Build Charge Slip for:</h1>
          <p className="text-muted-foreground">
            {clientInfo.name} – {clientInfo.institution}, {clientInfo.designation}
          </p>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={useAffiliationAsClientName}
              onCheckedChange={(val) => setUseAffiliationAsClientName(!!val)}
            />
            <span className="text-sm">Display affiliation as client name in PDF</span>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              checked={isInternal}
              onCheckedChange={(val: boolean) => setIsInternal(!!val)}
            />
            <span className="text-sm">Internal Client (Apply 12% discount)</span>
          </div>
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

        <Input
          placeholder="Search services..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4"
        />

        <ScrollArea className="h-[65vh] pr-2">
          <Accordion type="multiple" className="space-y-4">
            {Object.entries(groupedByType).map(([type, items]) => (
              <AccordionItem key={type} value={type}>
                <AccordionTrigger className="text-lg font-bold capitalize">
                  {type}
                </AccordionTrigger>
                <AccordionContent>{renderTable(items, type)}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>
      </div>

      {/* Right Summary Column */}
      <div className="w-96 shrink-0 sticky top-6 h-fit border p-4 rounded-md shadow-sm bg-white">
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