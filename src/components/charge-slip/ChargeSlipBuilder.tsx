"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { pdf, PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";

import { getServiceCatalog } from "@/services/serviceCatalogService";
import { getClientById, getProjectById } from "@/services/clientProjectService";
import {
  generateNextChargeSlipNumber,
  saveChargeSlipToFirestore,
} from "@/services/chargeSlipService";

import { SelectedService as StrictSelectedService } from "@/types/SelectedService";
import { ServiceItem } from "@/types/ServiceItem";
import { ChargeSlip } from "@/types/ChargeSlip";

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
// import ChargeSlipForm from "@/components/forms/ChargeSlipForm";
import { ChargeSlipFormData } from "@/schemas/chargeSlipSchema";

import type { AdminInfo } from "@/types/Admin";

interface ExtendedChargeSlip extends ChargeSlip {
  client: any;
  project: any;
  services: any[];
  chargeSlipNumber: string;
  orNumber: string;
  useInternalPrice: boolean;
  referenceNumber: string;
  isInternal: boolean;
  subtotal: number;
  discount: number;
  total: number;
  approvedBy?: string; // Optional for now
  projectId: string; // Added projectId to match usage
}

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
  const { user, adminInfo } = useAuth(); // Added adminInfo from useAuth
  const [selectedServices, setSelectedServices] = useState<EditableSelectedService[]>([]);
  const [client, setClient] = useState<any | null>(null);
  const [project, setProject] = useState<any | null>(null);
  const [chargeSlipNumber, setChargeSlipNumber] = useState<string>("");
  const [orNumber, setOrNumber] = useState<string>("");
  const [isInternal, setIsInternal] = useState(false);
  const [openPreview, setOpenPreview] = useState(false);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState<any>(null); // Added formData state

  const preparedBy: AdminInfo = adminInfo || { name: "Unknown", position: "Unknown", email: "unknown@example.com" }; // Use adminInfo or fallback

  const approvedBy = "John Doe"; // Example approvedBy value

  const clientInfo = {
    name: client?.name || "",
    institution: client?.affiliation || "",
    designation: client?.designation || "",
    email: client?.email || "",
  };

  const searchParams = useSearchParams();

  const effectiveClientId = clientId || searchParams.get("clientId") || "";
  const effectiveProjectId = projectId || searchParams.get("projectId") || "";

  const { data: catalog = [] } = useQuery({
    queryKey: ["serviceCatalog"],
    queryFn: getServiceCatalog,
  });

  const { data: clientDataFetched } = useQuery({
    queryKey: ["client", effectiveClientId],
    queryFn: () => getClientById(effectiveClientId),
    enabled: !!effectiveClientId,
  });

  const { data: projectDataFetched } = useQuery({
    queryKey: ["project", effectiveProjectId],
    queryFn: () => getProjectById(effectiveProjectId),
    enabled: !!effectiveProjectId,
  });

  useEffect(() => {
    const fetchRef = async () => {
      const year = new Date().getFullYear();
      const next = await generateNextChargeSlipNumber(year);
      setChargeSlipNumber(next);
    };
    fetchRef();
  }, []);

  useEffect(() => {
    console.log("Received clientData:", clientData); // Debugging log
    console.log("Received projectData:", projectData); // Debugging log

    if (clientData) {
      setClient(clientData);
    }

    if (projectData) {
      setProject(projectData);
    }
  }, [clientData, projectData]);

  const toggleService = (id: string, service: ServiceItem) => {
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.id === id);
      if (exists) return prev.filter((s) => s.id !== id);
      return [...prev, { ...service, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, qty: number | "") => {
    setSelectedServices((prev) =>
      prev.map((svc) => (svc.id === id ? { ...svc, quantity: qty } : svc))
    );
  };

  const cleanedServices: StrictSelectedService[] = selectedServices
    .filter((s) => typeof s.quantity === "number" && s.quantity > 0)
    .map((s) => ({ ...s, quantity: s.quantity as number }));

  const subtotal = cleanedServices.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );
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
          const quantity = isSelected?.quantity ?? "";
          const amount = isSelected && typeof quantity === "number" ? item.price * quantity : 0;

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
              <TableCell>{item.price.toFixed(2)}</TableCell>
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

  const renderGroupedTable = () => (
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
  );

  const handleFormSubmit = async (data: ChargeSlipFormData) => {
    const client = await getClientById(effectiveClientId);
    const project = await getProjectById(effectiveProjectId);
    const chargeSlipNumber = await generateNextChargeSlipNumber(Number(effectiveProjectId));

    const updatedFormData: ExtendedChargeSlip = {
      id: "TEMP-ID", // Default ID, replace with actual logic if needed
      ...data,
      client,
      project,
      projectId: effectiveProjectId, // Add projectId
      chargeSlipNumber, // Use chargeSlipNumber instead of referenceNumber
      orNumber: "", // Default orNumber
      useInternalPrice: isInternal,
      services: selectedServices,
      preparedBy: adminInfo || { name: "Unknown", position: "Unknown" },
      referenceNumber: chargeSlipNumber, // Added referenceNumber
      isInternal,
      subtotal,
      discount,
      total,
      dateIssued: new Date().toISOString(), // Convert dateIssued to string
      approvedBy: "Victor Marco Emmanuel N. Ferriols, Ph.D", // Default approvedBy
    };

    setFormData(updatedFormData);
  };

  return (
    <div className="p-6 flex gap-6">
      <div className="flex-1">
        <div className="mb-6">
          <h1 className="text-xl font-semibold mb-1">Build Charge Slip for:</h1>
          <p className="text-muted-foreground">
            {clientInfo.name} 
            {clientInfo.institution && ` – ${clientInfo.institution}`}
          </p>
        </div>

        <Input
          placeholder="Search services..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4"
        />

        {renderGroupedTable()}
      </div>

      <div className="w-96 shrink-0 sticky top-6 h-fit border p-4 rounded-md shadow-sm bg-white">
        <h3 className="text-lg font-bold mb-2">Summary</h3>
        <Separator className="mb-2" />
        {cleanedServices.map((item) => (
          <div key={item.id} className="flex justify-between text-sm mb-1">
            <span>
              {item.name} x {item.quantity}
            </span>
            <span>PHP {(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        <Separator className="my-2" />
        <p className="text-sm">Subtotal: PHP {subtotal.toFixed(2)}</p>
        {isInternal && (
          <p className="text-sm">Discount (12%): PHP {discount.toFixed(2)}</p>
        )}
        <p className="text-base font-semibold text-primary">
          Total: PHP {total.toFixed(2)}
        </p>

        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-4 items-center">
            <Checkbox
              checked={isInternal}
              onCheckedChange={(val: boolean) => setIsInternal(!!val)}
            />
            <span>Internal Client (Apply 12% discount)</span>
          </div>
        </div>

        <Dialog open={openPreview} onOpenChange={setOpenPreview}>
          <DialogTrigger asChild>
            <Button className="mt-4 w-full">Preview Charge Slip</Button>
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
                  preparedBy={preparedBy}
                  referenceNumber={chargeSlipNumber}
                  clientInfo={clientInfo}
                  approvedBy={approvedBy}
                  dateIssued={new Date().toISOString()}
                  subtotal={subtotal}
                  discount={discount}
                  total={total}
                />
              </PDFViewer>
              <div className="text-right mt-4">
                <PDFDownloadLink
                  document={
                    <ChargeSlipPDF
                      services={cleanedServices}
                      client={client}
                      project={project}
                      chargeSlipNumber={chargeSlipNumber}
                      orNumber={orNumber}
                      useInternalPrice={isInternal}
                      preparedBy={preparedBy}
                      referenceNumber={chargeSlipNumber}
                      clientInfo={clientInfo}
                      approvedBy={approvedBy}
                      dateIssued={new Date().toISOString()}
                      subtotal={subtotal}
                      discount={discount}
                      total={total}
                    />
                  }
                  fileName={`${chargeSlipNumber}.pdf`}
                >
                  {({ loading }) => (
                    <Button disabled={loading} className="mt-4">
                      {loading ? "Preparing..." : "Download Final PDF"}
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