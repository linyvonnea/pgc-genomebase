"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, notFound } from "next/navigation";
import { getChargeSlipById, updateChargeSlip } from "@/services/chargeSlipService";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ChargeSlipRecord } from "@/types/ChargeSlipRecord";
import { Timestamp } from "firebase/firestore";

// Utility to normalize to string date
const formatDate = (val: Date | string | Timestamp | null | undefined): string => {
  if (!val) return "—";
  if (typeof val === "string") {
    const parsed = new Date(val);
    return isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString("en-CA");
  }
  if (val instanceof Timestamp) return val.toDate().toLocaleDateString("en-CA");
  if (val instanceof Date) return val.toLocaleDateString("en-CA");
  return "—";
};

// Type guard for Firebase Timestamp
const isTimestamp = (val: any): val is Timestamp =>
  val?.seconds !== undefined && val?.nanoseconds !== undefined;

export default function ChargeSlipDetailPage() {
  const { chargeSlipNumber } = useParams() as { chargeSlipNumber: string };
  const router = useRouter();

  const [record, setRecord] = useState<ChargeSlipRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const [dvNumber, setDvNumber] = useState("");
  const [orNumber, setOrNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"processing" | "paid" | "cancelled">("processing");
  const [dateOfOR, setDateOfOR] = useState<Timestamp | undefined>(undefined);

  useEffect(() => {
    const fetch = async () => {
      const data = await getChargeSlipById(chargeSlipNumber);
      if (!data) return notFound();

      setRecord(data);
      setDvNumber(data.dvNumber ?? "");
      setOrNumber(data.orNumber ?? "");
      setNotes(data.notes ?? "");
      setStatus((data.status as "processing" | "paid" | "cancelled") ?? "processing");

      const rawDate = data.dateOfOR;
      if (isTimestamp(rawDate)) setDateOfOR(rawDate);
      else if (typeof rawDate === "string") setDateOfOR(Timestamp.fromDate(new Date(rawDate)));

      setLoading(false);
    };
    fetch();
  }, [chargeSlipNumber]);

  useEffect(() => {
    if (orNumber.trim() && !dateOfOR) {
      setDateOfOR(Timestamp.fromDate(new Date()));
    }
  }, [orNumber]);

  const handleSave = async () => {
    if (!record?.id) return;

    try {
      await updateChargeSlip(record.id, {
        dvNumber,
        orNumber,
        notes,
        status,
        dateOfOR,
      });

      toast.success("Charge slip updated successfully.");
    } catch (error) {
      toast.error("Failed to update charge slip.");
    }
  };

  if (loading || !record) return <p className="p-10">Loading...</p>;

  const derivedCategories =
    record.categories?.length && record.categories.some(Boolean)
      ? record.categories
      : Array.from(
          new Set((record.services ?? []).map((s) => s.type ?? "").filter(Boolean))
        );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50/50 to-blue-50/30 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Modern Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#166FB5] to-[#4038AF] bg-clip-text text-transparent">
                Charge Slip Details
              </h1>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">CS Number:</span>
                  <Badge variant="outline" className="font-mono text-[#F69122] border-[#F69122]/30 bg-[#F69122]/5">
                    {record.chargeSlipNumber}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">Issued:</span>
                  <span className="text-sm font-medium text-slate-800">{formatDate(record.dateIssued)}</span>
                </div>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => router.push("/admin/charge-slips")}
              className="hover:bg-slate-50 border-slate-200"
            >
              ← Back to List
            </Button>
          </div>
        </div>

        {/* Client & Project Information Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-gradient-to-r from-[#F69122] to-[#B9273A] rounded-full"></div>
            Client & Project Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Client Name</span>
                <span className="text-sm font-medium text-slate-800">{record.clientInfo?.name || "—"}</span>
              </div>
              
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Client ID</span>
                <span className="text-sm font-medium text-slate-800">{record.cid || "—"}</span>
              </div>

              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Address</span>
                <span className="text-sm font-medium text-slate-800">{record.clientInfo?.address || record.client?.affiliationAddress || "—"}</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Project Title</span>
                <span className="text-sm font-medium text-slate-800">{record.project?.title || "—"}</span>
              </div>
              
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Project ID</span>
                <span className="text-sm font-medium text-slate-800">{record.projectId || "—"}</span>
              </div>

              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Amount</span>
                <span className="text-xl font-bold bg-gradient-to-r from-[#F69122] to-[#B9273A] bg-clip-text text-transparent">
                  ₱{record.total.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Service Categories</span>
              <div className="flex items-center gap-2 flex-wrap">
                {derivedCategories.map((cat, index) => (
                  <Badge 
                    key={index} 
                    className="capitalize bg-gradient-to-r from-[#166FB5]/10 to-[#4038AF]/10 text-[#166FB5] border-[#166FB5]/20 hover:bg-[#166FB5]/20"
                  >
                    {cat}
                  </Badge>
                ))}
                {derivedCategories.length === 0 && <span className="text-sm text-slate-500">No categories available</span>}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Services</span>
              <div className="text-sm text-slate-700">
                {record.services?.map((s) => s.name).join(", ") || "No services listed"}
              </div>
            </div>
          </div>
        </div>

        {/* Status & Administrative Details Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-gradient-to-r from-[#912ABD] to-[#6E308E] rounded-full"></div>
            Status & Administrative Details
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">Status</label>
                <Select
                  value={status}
                  onValueChange={(value) => setStatus(value as "processing" | "paid" | "cancelled")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">DV Number</label>
                <Input 
                  value={dvNumber} 
                  onChange={(e) => setDvNumber(e.target.value)}
                  placeholder="Enter DV number"
                  className="w-full"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">OR Number</label>
                <Input 
                  value={orNumber} 
                  onChange={(e) => setOrNumber(e.target.value)}
                  placeholder="Enter OR number"
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">Date of OR</label>
                <Input
                  type="date"
                  value={
                    dateOfOR
                      ? dateOfOR.toDate().toISOString().split("T")[0]
                      : ""
                  }
                  onChange={(e) => {
                    const inputDate = e.target.value;
                    if (inputDate) {
                      setDateOfOR(Timestamp.fromDate(new Date(inputDate)));
                    } else {
                      setDateOfOR(undefined);
                    }
                  }}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <div className="mt-6">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">Notes</label>
            <Textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes or comments..."
              className="w-full min-h-[100px]"
            />
          </div>
        </div>

        {/* Save Changes Card */}
        <div className="bg-gradient-to-r from-[#F69122]/5 via-[#B9273A]/5 to-[#912ABD]/5 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
          <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <div className="w-2 h-2 bg-gradient-to-r from-[#F69122] to-[#912ABD] rounded-full"></div>
            Save Changes
          </h2>
          <p className="text-sm text-slate-600 mb-4">Update the charge slip with the latest information</p>
          
          <Button 
            onClick={handleSave}
            className="bg-gradient-to-r from-[#166FB5] to-[#4038AF] hover:from-[#145a9b] hover:to-[#362f8f] text-white font-medium px-6 py-2 rounded-lg transition-all duration-200 shadow-lg"
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}