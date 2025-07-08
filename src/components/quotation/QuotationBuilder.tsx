// src/components/quotation/QuotationBuilder.tsx
"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";

import mockCatalog from "@/mock/mock_catalog.json";
import { mockInquiries } from "@/mock/mockInquiries";

import { SelectedService } from "@/types/SelectedService";
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

import { PDFViewer, PDFDownloadLink } from "@react-pdf/renderer";
import { QuotationPDF } from "./QuotationPDF";

import {
  mockQuotationHistory,
  addMockQuotation,
} from "@/mock/mockQuotationHistory";

import { QuotationHistoryPanel } from "./QuotationHistoryPanel";
import { generateNextReferenceNumber } from "@/lib/generateReferenceNumber";

type QuotationBuilderProps = {
  inquiryId?: string;
  initialClientInfo?: {
    name: string;
    institution: string;
    designation: string;
    email: string;
  };
};

export default function QuotationBuilder({
  inquiryId,
  initialClientInfo,
}: QuotationBuilderProps) {
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [isInternal, setIsInternal] = useState(false);
  const [openPreview, setOpenPreview] = useState(false);
  const [search, setSearch] = useState("");

  const searchParams = useSearchParams();
  const effectiveInquiryId = inquiryId || searchParams.get("inquiryId") || "";

  const matchedInquiry = !initialClientInfo
    ? mockInquiries.find((inq) => inq.id === effectiveInquiryId)
    : null;

  const clientInfo = initialClientInfo
    ? initialClientInfo
    : matchedInquiry
    ? {
        name: matchedInquiry.name,
        institution: matchedInquiry.affiliation,
        designation: matchedInquiry.designation,
        email: matchedInquiry.email,
      }
    : {
        name: "Unknown",
        institution: "N/A",
        designation: "N/A",
        email: "N/A",
      };

  const currentYear = new Date().getFullYear();
  const nextReferenceNumber = generateNextReferenceNumber(currentYear);

  const toggleService = (id: string, service: ServiceItem) => {
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.id === id);
      if (exists) return prev.filter((s) => s.id !== id);
      return [...prev, { ...service, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, qty: number) => {
    setSelectedServices((prev) =>
      prev.map((svc) => (svc.id === id ? { ...svc, quantity: qty } : svc))
    );
  };

  const subtotal = selectedServices.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );
  const discount = isInternal ? subtotal * 0.12 : 0;
  const total = subtotal - discount;

  const groupedByType = useMemo(() => {
    const result: Record<string, ServiceItem[]> = {};
    for (const item of mockCatalog as ServiceItem[]) {
      if (!search || item.name.toLowerCase().includes(search.toLowerCase())) {
        if (!result[item.type]) result[item.type] = [];
        result[item.type].push(item);
      }
    }
    return result;
  }, [search]);

  const renderTable = (services: ServiceItem[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>✔</TableHead>
          <TableHead>Service</TableHead>
          <TableHead>Unit</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Qty</TableHead>
          <TableHead>Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {services.map((item) => {
          const isSelected = selectedServices.find((s) => s.id === item.id);
          const quantity = isSelected?.quantity || 1;
          const amount = isSelected ? item.price * quantity : 0;

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
              <TableCell>₱{item.price.toFixed(2)}</TableCell>
              <TableCell>
                <Input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => updateQuantity(item.id, +e.target.value)}
                  disabled={!isSelected}
                />
              </TableCell>
              <TableCell>₱{amount.toFixed(2)}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  return (
    <div className="p-6 flex gap-6">
      {/* LEFT PANEL */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Quotation Builder</h2>
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
                <AccordionContent>{renderTable(items)}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>
      </div>

      {/* RIGHT SUMMARY PANEL */}
      <div className="w-96 shrink-0 sticky top-6 h-fit border p-4 rounded-md shadow-sm bg-white">
        <h3 className="text-lg font-bold mb-2">Summary</h3>
        <Separator className="mb-2" />
        {selectedServices.map((item) => (
          <div key={item.id} className="flex justify-between text-sm mb-1">
            <span>
              {item.name} x {item.quantity}
            </span>
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
                  services={selectedServices}
                  clientInfo={clientInfo}
                  referenceNumber={nextReferenceNumber}
                  useInternalPrice={isInternal}
                  remarks="For confirmation. Valid for 30 days."
                />
              </PDFViewer>
              <div className="text-right mt-4">
                <PDFDownloadLink
                  document={
                    <QuotationPDF
                      services={selectedServices}
                      clientInfo={clientInfo}
                      referenceNumber={nextReferenceNumber}
                      useInternalPrice={isInternal}
                      remarks="For confirmation. Valid for 30 days."
                    />
                  }
                  fileName={`${nextReferenceNumber}.pdf`}
                >
                  {({ loading }) => (
                    <Button
                      disabled={loading}
                      onClick={() => {
                        addMockQuotation(effectiveInquiryId, {
                            referenceNumber: nextReferenceNumber,
                            clientInfo,
                            services: selectedServices,
                            isInternal,
                            remarks: "For confirmation. Valid for 30 days.",
                            dateIssued: new Date().toISOString(),
                            year: currentYear,
                            subtotal,
                            discount,
                            total,
                            preparedBy: "",
                            categories: Array.from(new Set(selectedServices.map((s) => s.type))),
                            inquiryId: effectiveInquiryId
                        });
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