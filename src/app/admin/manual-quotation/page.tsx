"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PDFViewer, PDFDownloadLink } from "@react-pdf/renderer";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import useAuth from "@/hooks/useAuth";
import { getServiceCatalog } from "@/services/serviceCatalogService";
import { QuotationPDF } from "@/components/quotation/QuotationPDF";
import { ServiceItem } from "@/types/ServiceItem";
import { SelectedService as StrictSelectedService } from "@/types/SelectedService";
import { PermissionGuard } from "@/components/PermissionGuard";
import { calculateItemTotal } from "@/lib/calculatePrice";
import { GroupedServiceSelector } from "@/components/forms/GroupedServiceSelector";

// Editable version for input
type EditableSelectedService = Omit<StrictSelectedService, "quantity"> & {
  quantity: number | "";
  samples?: number | "";
  participants?: number | "";
};

export default function ManualQuotationPage() {
  return (
    <PermissionGuard module="manualQuotation" action="view">
      <ManualQuotationContent />
    </PermissionGuard>
  );
}

function ManualQuotationContent() {
  const router = useRouter();
  const { user, isAdmin, loading, adminInfo } = useAuth();

  const [clientInfo, setClientInfo] = useState({
    name: "",
    institution: "",
    designation: "",
    email: "",
  });
  const [selectedServices, setSelectedServices] = useState<EditableSelectedService[]>([]);
  const [search, setSearch] = useState("");
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [isInternal, setIsInternal] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [openPreview, setOpenPreview] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) router.replace("/login");
  }, [loading, isAdmin, router]);

  const { data: catalog = [] } = useQuery({
    queryKey: ["manual-serviceCatalog"],
    queryFn: getServiceCatalog,
  });

  const toggleService = (id: string, service: ServiceItem) => {
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.id === id);
      if (exists) return prev.filter((s) => s.id !== id);
      return [...prev, { ...service, quantity: 1, samples: 0, participants: 0, description: service.description }];
    });
  };

  const updateQuantity = (id: string, qty: number | "") => {
    setSelectedServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, quantity: qty } : s))
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

  const groupedByType = catalog.reduce<Record<string, ServiceItem[]>>((acc, item) => {
    const selectedIds = new Set(selectedServices.map(s => s.id));
    const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = !showSelectedOnly || selectedIds.has(item.id);
    
    if (matchesSearch && matchesFilter) {
      acc[item.type] = acc[item.type] || [];
      acc[item.type].push(item);
    }
    return acc;
  }, {});

  return (
    <div className="p-6 flex gap-6">
      <div className="flex-[2] min-w-[520px]">
        <div className="mb-4 space-y-2">
          <h1 className="text-xl font-semibold">Manual Quotation Builder</h1>
          <Input
            placeholder="Reference Number"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
          />
          <Input
            placeholder="Client Name"
            value={clientInfo.name}
            onChange={(e) => setClientInfo({ ...clientInfo, name: e.target.value })}
          />
          <Input
            placeholder="Institution"
            value={clientInfo.institution}
            onChange={(e) => setClientInfo({ ...clientInfo, institution: e.target.value })}
          />
          <Input
            placeholder="Designation"
            value={clientInfo.designation}
            onChange={(e) => setClientInfo({ ...clientInfo, designation: e.target.value })}
          />
          <Input
            placeholder="Email"
            value={clientInfo.email}
            onChange={(e) => setClientInfo({ ...clientInfo, email: e.target.value })}
          />
          <div className="flex items-center gap-2 pt-2">
            <Checkbox
              checked={isInternal}
              onCheckedChange={(val) => setIsInternal(!!val)}
            />
            <span>Internal Client (Apply 12% discount)</span>
          </div>
        </div>

        <div className="flex gap-4 items-center mb-4">
          <Input
            placeholder="Search services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <div className="flex items-center gap-2 whitespace-nowrap">
            <Checkbox
              checked={showSelectedOnly}
              onCheckedChange={(val) => setShowSelectedOnly(!!val)}
            />
            <span className="text-sm">Show selected only</span>
          </div>
        </div>

        <ScrollArea className="h-[60vh] pr-2 w-full">
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
                  const serviceType = item.type.toLowerCase();
                  let totalAmount = 0;
                  
                  if (serviceType.includes('bioinformatics') || serviceType.includes('bioinfo')) {
                    const samples = (item as any).samples ?? 1;
                    const samplesAmount = calculateItemTotal(samples, item.price, {
                      minQuantity: (item as any).minQuantity,
                      additionalUnitPrice: (item as any).additionalUnitPrice,
                    });
                    totalAmount = samplesAmount * item.quantity;
                  } else if (serviceType.includes('training')) {
                    const participants = (item as any).participants ?? 1;
                    const participantsAmount = calculateItemTotal(participants, item.price, {
                      minQuantity: (item as any).minParticipants,
                      additionalUnitPrice: (item as any).additionalParticipantPrice,
                    });
                    totalAmount = participantsAmount * item.quantity;
                  } else {
                    totalAmount = item.price * item.quantity;
                  }
                  
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
                <PDFDownloadLink
                  document={
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
                  }
                  fileName={`${referenceNumber || "manual-quotation"}.pdf`}
                >
                  {({ loading }) => (
                    <Button disabled={loading || cleanedServices.length === 0}>
                      {loading ? "Preparing..." : "Download Quotation PDF"}
                    </Button>
                  )}
                </PDFDownloadLink>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}