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
      <div className="flex-1">
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

        <ScrollArea className="h-[60vh] pr-2">
          <Accordion type="multiple" className="space-y-4">
            {Object.entries(groupedByType).map(([type, items]) => (
              <AccordionItem key={type} value={type}>
                <AccordionTrigger className="capitalize font-semibold text-md">
                  {type}
                </AccordionTrigger>
                <AccordionContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px] font-semibold">✔</TableHead>
                        <TableHead className="min-w-[250px] font-semibold">Service</TableHead>
                        <TableHead className="w-[100px] font-semibold">Unit</TableHead>
                        <TableHead className="w-[100px] text-right font-semibold">Price</TableHead>
                        <TableHead className="w-[100px]">
                          <span className={type.toLowerCase().includes('bioinformatics') || type.toLowerCase().includes('bioinfo') ? "font-semibold" : "font-normal"}>
                            Samples
                          </span>
                        </TableHead>
                        <TableHead className="w-[120px]">
                          <span className={type.toLowerCase().includes('training') ? "font-semibold" : "font-normal"}>
                            Participants
                          </span>
                        </TableHead>
                        <TableHead className="w-[80px] font-semibold">Qty</TableHead>
                        <TableHead className="w-[120px] text-right font-semibold">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => {
                        const isSelected = selectedServices.find((s) => s.id === item.id);
                        const samples = (isSelected as any)?.samples ?? "";
                        const participants = (isSelected as any)?.participants ?? "";
                        const quantity = isSelected?.quantity ?? "";
                        const price = isSelected?.price ?? 0;
                        const isBioinformatics = type.toLowerCase().includes('bioinformatics') || type.toLowerCase().includes('bioinfo');
                        const isTraining = type.toLowerCase().includes('training');

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
                            <TableCell className="text-right">{item.price.toFixed(2)}</TableCell>
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
                                disabled={!isSelected || !isBioinformatics}
                                placeholder={isBioinformatics ? "0" : "—"}
                              />
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
                                value={quantity}
                                min={0}
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
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>
      </div>

      <div className="w-96 shrink-0 sticky top-6 h-fit border p-4 rounded-md shadow-sm bg-white">
        <h3 className="text-lg font-bold mb-2">Summary</h3>
        <Separator className="mb-2" />
        {cleanedServices.map((item) => (
          <div key={item.id} className="flex justify-between text-sm mb-1">
            <span>{item.name} x {item.quantity}</span>
            <span>₱{(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        <Separator className="my-2" />
        <p className="text-sm">Subtotal: ₱{subtotal.toFixed(2)}</p>
        {isInternal && (
          <p className="text-sm">Discount (12%): ₱{discount.toFixed(2)}</p>
        )}
        <p className="text-base font-semibold text-primary">
          Total: ₱{total.toFixed(2)}
        </p>

        <Dialog open={openPreview} onOpenChange={setOpenPreview}>
          <DialogTrigger asChild>
            <Button className="mt-4 w-full">Preview Quotation</Button>
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
                    name: adminInfo?.name || "Admin",
                    position: adminInfo?.position || "N/A",
                  }}
                  dateOfIssue={new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                />
              </PDFViewer>
              <div className="text-right mt-4">
                <PDFDownloadLink
                  document={
                    <QuotationPDF
                      services={cleanedServices}
                      clientInfo={clientInfo}
                      referenceNumber={referenceNumber}
                      useInternalPrice={isInternal}
                      preparedBy={{
                        name: adminInfo?.name || "Admin",
                        position: adminInfo?.position || "N/A",
                      }}
                      dateOfIssue={new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    />
                  }
                  fileName={`${referenceNumber || "manual-quotation"}.pdf`}
                >
                  {({ loading }) => (
                    <Button disabled={loading}>
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