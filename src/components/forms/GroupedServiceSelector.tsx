"use client";

import { useMemo } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ServiceItem } from "@/types/ServiceItem";
import { calculateItemTotal } from "@/lib/calculatePrice";

interface GroupedServiceSelectorProps {
  catalog: ServiceItem[];
  selectedServices: any[];
  search: string;
  showSelectedOnly: boolean;
  onToggleService: (id: string, service: ServiceItem) => void;
  onUpdateQuantity: (id: string, qty: number | "") => void;
  onUpdateSamples: (id: string, samples: number | "") => void;
  onUpdateParticipants: (id: string, participants: number | "") => void;
}

export function GroupedServiceSelector({
  catalog,
  selectedServices,
  search,
  showSelectedOnly,
  onToggleService,
  onUpdateQuantity,
  onUpdateSamples,
  onUpdateParticipants,
}: GroupedServiceSelectorProps) {
  
  const serviceTypes = ["Bioinformatics", "Laboratory", "Equipment", "Retail", "Training"];
  
  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      bioinformatics: "bg-purple-100 text-purple-800 border-purple-300",
      laboratory: "bg-blue-100 text-blue-800 border-blue-300",
      equipment: "bg-green-100 text-green-800 border-green-300",
      retail: "bg-orange-100 text-orange-800 border-orange-300",
      training: "bg-indigo-100 text-indigo-800 border-indigo-300",
    };
    return colors[type.toLowerCase()] || "bg-gray-100 text-gray-800 border-gray-300";
  };

  const groupedByType = useMemo(() => {
    const result: Record<string, ServiceItem[]> = {};
    const selectedIds = new Set(selectedServices.map(s => s.id));
    
    for (const item of catalog) {
      const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = !showSelectedOnly || selectedIds.has(item.id);
      
      if (matchesSearch && matchesFilter) {
        // Normalize the type to capitalized version for grouping
        const normalizedType = item.type.charAt(0).toUpperCase() + item.type.slice(1).toLowerCase();
        if (!result[normalizedType]) result[normalizedType] = [];
        result[normalizedType].push(item);
      }
    }
    return result;
  }, [search, catalog, showSelectedOnly, selectedServices]);

  const renderServiceTable = (services: ServiceItem[], serviceType: string) => {
    const normalizedType = serviceType.toLowerCase();
    const isBioinformatics = normalizedType === "bioinformatics";
    const isTraining = normalizedType === "training";
    
    return (
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[50px]">✔</TableHead>
              <TableHead className="min-w-[280px]">
                <div className="font-semibold">Service</div>
              </TableHead>
              <TableHead className="w-[100px]">Unit</TableHead>
              <TableHead className="w-[100px] text-right">Price</TableHead>
              <TableHead className="w-[120px]">
                {isBioinformatics ? "Samples" : isTraining ? <span className="font-semibold">Participants</span> : "—"}
              </TableHead>
              <TableHead className="w-[100px]">Qty</TableHead>
              <TableHead className="w-[120px] text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((item) => {
              const isSelected = selectedServices.find((s) => s.id === item.id);
              const samples = (isSelected as any)?.samples ?? "";
              const participants = (isSelected as any)?.participants ?? "";
              const quantity = isSelected?.quantity ?? "";
              const price = isSelected?.price ?? 0;

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
                <TableRow key={item.id} className={isSelected ? "bg-blue-50/50" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={!!isSelected}
                      onCheckedChange={() => onToggleService(item.id, item)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium truncate max-w-[280px]" title={item.name}>
                        {item.name}
                      </div>
                      {item.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1" title={item.description}>
                          {item.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.unit}</TableCell>
                  <TableCell className="text-right font-medium">
                    ₱{item.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    {isBioinformatics && (
                      <Input
                        type="number"
                        min={0}
                        value={samples}
                        onChange={(e) =>
                          onUpdateSamples(
                            item.id,
                            e.target.value === "" ? "" : +e.target.value
                          )
                        }
                        disabled={!isSelected}
                        placeholder="0"
                        className="h-8"
                      />
                    )}
                    {isTraining && (
                      <Input
                        type="number"
                        min={0}
                        value={participants}
                        onChange={(e) =>
                          onUpdateParticipants(
                            item.id,
                            e.target.value === "" ? "" : +e.target.value
                          )
                        }
                        disabled={!isSelected}
                        placeholder="0"
                        className="h-8"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) =>
                        onUpdateQuantity(
                          item.id,
                          e.target.value === "" ? "" : +e.target.value
                        )
                      }
                      disabled={!isSelected}
                      placeholder="0"
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {amount > 0 ? `₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <Accordion type="multiple" className="space-y-3" defaultValue={serviceTypes}>
      {serviceTypes.map((type) => {
        const services = groupedByType[type] || [];
        if (services.length === 0) return null;
        
        return (
          <AccordionItem 
            key={type} 
            value={type}
            className="border rounded-lg overflow-hidden shadow-sm"
          >
            <AccordionTrigger className={`px-4 py-3 ${getTypeBadgeColor(type)} hover:no-underline`}>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={`${getTypeBadgeColor(type)} font-semibold`}>
                  {type}
                </Badge>
                <span className="font-semibold text-base">{type}</span>
                <span className="text-sm text-muted-foreground">
                  ({services.length} service{services.length !== 1 ? 's' : ''})
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-0 pb-0">
              <div className="pl-6 pr-4 pb-3">
                {renderServiceTable(services, type)}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
