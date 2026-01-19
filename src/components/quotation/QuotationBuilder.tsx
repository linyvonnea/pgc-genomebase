// src/components/quotation/QuotationBuilder.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { calculateItemTotal } from "@/lib/calculatePrice";
import { getServiceCatalog } from "@/services/serviceCatalogService";
import { getInquiryById } from "@/services/inquiryService";
import { saveQuotationAction } from "@/app/actions/quotationActions";

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

import { PDFViewer, PDFDownloadLink } from "@react-pdf/renderer";
import { QuotationPDF } from "./QuotationPDF";
import { QuotationHistoryPanel } from "./QuotationHistoryPanel";
import useAuth from "@/hooks/useAuth";

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
  const [referenceNumber, setReferenceNumber] = useState<string>("");

  const { adminInfo } = useAuth();
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

  useEffect(() => {
    const fetchRef = async () => {
      const year = new Date().getFullYear();
      const next = await generateNextReferenceNumber(year);
      setReferenceNumber(next);
    };
    fetchRef();
  }, []);

  const clientInfo = initialClientInfo
    ? initialClientInfo
    : inquiryData
    ? {
        name: inquiryData.name,
        institution: inquiryData.affiliation,
        designation: inquiryData.designation,
        email: inquiryData.email ?? "",
      }
    : {
        name: "Unknown",
        institution: "N/A",
        designation: "N/A",
        email: "",
      };

  const currentYear = new Date().getFullYear();

  const toggleService = (id: string, service: ServiceItem) => {
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.id === id);
      if (exists) return prev.filter((s) => s.id !== id);
      return [...prev, { ...service, quantity: 1, samples: 0 }];
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

  const handleSaveQuotation = async () => {
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

      const result = await saveQuotationAction(quotationRecord);

      if (result.success) {
        toast.success("Quotation saved successfully!");
        // router.push("/admin/quotations"); // Uncomment if you want to redirect
      } else {
        toast.error(result.error || "Failed to save quotation");
      }
    } catch (error) {
      console.error("Error saving quotation:", error);
      toast.error("Failed to save quotation.");
    }
  };

  return (
    <div className="p-6 flex gap-6">
      <div className="flex-1">
        <div className="mb-6">
          <h1 className="text-xl font-semibold mb-1">Build Quotation for:</h1>
          <p className="text-muted-foreground">
            {clientInfo.name} – {clientInfo.institution}, {clientInfo.designation}
          </p>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-4 items-center">
            <Checkbox
              checked={isInternal}
              onCheckedChange={(val: boolean) => setIsInternal(!!val)}
            />
            <span>Internal Client (Apply 12% discount)</span>
          </div>
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

      <div className="w-96 shrink-0 sticky top-6 h-fit border p-4 rounded-md shadow-sm bg-white">
        <h3 className="text-lg font-bold mb-2">Summary</h3>
        <Separator className="mb-2" />
        {cleanedServices.map((item) => {
          const samples = (item as any).samples ?? 1;
          const samplesAmount = calculateItemTotal(samples, item.price, {
            minQuantity: (item as any).minQuantity,
            additionalUnitPrice: (item as any).additionalUnitPrice,
          });
          const totalAmount = samplesAmount * item.quantity;
          
          return (
            <div key={item.id} className="flex justify-between text-sm mb-1">
              <span>
                {item.name} x {item.quantity}
              </span>
              <span>₱{totalAmount.toFixed(2)}</span>
            </div>
          );
        })}
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
                    name: adminInfo?.name || "—",
                    position: adminInfo?.position || "—",
                  }}
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
                        name: adminInfo?.name || "—",
                        position: adminInfo?.position || "—",
                      }}
                    />
                  }
                  fileName={`${referenceNumber}.pdf`}
                >
                  {({ loading }) => (
                    <Button
                      disabled={loading}
                      onClick={async () => {
                        try {
                          const quotationToSave = {
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
                          await saveQuotationToFirestore(quotationToSave);
                        } catch (err) {
                          console.error("Failed to save quotation", err);
                        }
                      }}
                    >
                      {loading ? "Preparing..." : "Generate Final Quotation"}
                    </Button>
                  )}
                </PDFDownloadLink>
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