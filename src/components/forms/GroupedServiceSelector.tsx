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

  // Professional order: Laboratory, Equipment, Bioinformatics, Retail, Training
  const serviceTypes = ["Laboratory", "Equipment", "Bioinformatics", "Retail", "Training"];

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
    const isTraining = normalizedType === "training";

    // Group services by category
    const servicesByCategory: Record<string, ServiceItem[]> = {};
    for (const svc of services) {
      const cat = svc.category || 'Uncategorized';
      if (!servicesByCategory[cat]) servicesByCategory[cat] = [];
      servicesByCategory[cat].push(svc);
    }
    const categoryNames = Object.keys(servicesByCategory);

    return (
      <div className="border rounded-md overflow-hidden w-full">
        <Table className="w-full">
          <colgroup>
            <col style={{ width: '40px' }} />
            <col style={{ width: '180px' }} />
            <col style={{ width: '80px' }} />
            <col style={{ width: '90px' }} />
            <col style={{ width: '100px' }} />
            <col style={{ width: '70px' }} />
            <col style={{ width: '90px' }} />
          </colgroup>
          <TableHeader>
            <TableRow className="bg-slate-50 border-b-2">
              <TableHead className="w-[48px] text-center">✔</TableHead>
              <TableHead className="min-w-[240px]">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Service Description</span>
              </TableHead>
              <TableHead className="text-center">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unit</span>
              </TableHead>
              <TableHead className="text-right">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unit Price</span>
              </TableHead>
              <TableHead className="text-center">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {isTraining ? "Participants" : "Details"}
                </span>
              </TableHead>
              <TableHead className="text-center">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quantity</span>
              </TableHead>
              <TableHead className="text-right pr-6">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subtotal</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categoryNames.map((cat) => [
              // Category separator row
              <TableRow key={cat + "-sep"} className="bg-gray-50">
                <TableCell colSpan={7} className="!p-3 !pl-4 text-sm font-semibold text-gray-700 border-b border-gray-200 tracking-wide">
                  {cat}
                </TableCell>
              </TableRow>,
              // Services in this category
              ...servicesByCategory[cat].map((item) => {
                const isSelected = selectedServices.find((s) => s.id === item.id);
                const participants = (isSelected as any)?.participants ?? "";
                const quantity = isSelected?.quantity ?? "";
                const price = isSelected?.price ?? 0;

                let amount = 0;
                if (isSelected && typeof quantity === "number") {
                  if (isTraining && typeof participants === "number") {
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
                  <TableRow key={item.id} className={`${isSelected ? "bg-blue-50/40 hover:bg-blue-50/60" : "hover:bg-slate-50/80"} transition-colors border-b last:border-0`}>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={!!isSelected}
                        onCheckedChange={() => onToggleService(item.id, item)}
                        className="data-[state=checked]:bg-blue-600 border-slate-300"
                      />
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex flex-col gap-0.5">
                        <div className={`text-sm font-bold ${isSelected ? "text-blue-700" : "text-slate-700"} truncate max-w-[320px]`} title={item.name}>
                          {item.name}
                        </div>
                        {item.description && (
                          <div className="text-[11px] text-slate-400 font-medium line-clamp-1 leading-relaxed" title={item.description}>
                            {item.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-[10px] font-bold bg-slate-50 text-slate-500 border-slate-200 px-1.5 py-0">
                        {item.unit}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <span className="text-sm font-semibold text-slate-600 tabular-nums">
                        ₱{item.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </TableCell>
                    <TableCell className="px-2">
                      <div className="flex justify-center">
                        {isTraining ? (
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
                            className="h-8 w-16 text-center text-xs font-bold border-slate-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all rounded-md shadow-sm"
                          />
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-2">
                      <div className="flex justify-center">
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
                          placeholder="1"
                          className={`h-8 w-16 text-center text-xs font-bold border-slate-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all rounded-md shadow-sm ${isSelected ? "bg-white" : "bg-slate-50/50"}`}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6 font-bold text-slate-900 tabular-nums">
                      {amount > 0 ? (
                        <span className="text-sm">
                          ₱{amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            ])}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <Accordion type="multiple" className="space-y-3">
      {serviceTypes.map((type) => {
        const services = groupedByType[type] || [];
        if (services.length === 0) return null;

        return (
          <AccordionItem
            key={type}
            value={type}
            className="border rounded-lg overflow-hidden shadow-sm"
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline bg-white">
              <div className="flex items-center gap-3">
                <span className="font-bold text-base">{type}</span>
                <span className="text-base text-muted-foreground font-semibold">
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
