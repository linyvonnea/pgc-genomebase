"use client";

import { useEffect, useState } from "react";
import { useParams, notFound } from "next/navigation";
import { getChargeSlipById, updateChargeSlip } from "@/services/chargeSlipService";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ChargeSlipRecord } from "@/types/ChargeSlipRecord";
import { normalizeDate } from "@/lib/formatters";
import { Timestamp } from "firebase/firestore";

export default function ChargeSlipDetailPage() {
  const { chargeSlipNumber } = useParams() as { chargeSlipNumber: string };
  const [record, setRecord] = useState<ChargeSlipRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // Editable fields
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
      setStatus(data.status ?? "processing");
      setDateOfOR(data.dateOfOR instanceof Timestamp ? data.dateOfOR : undefined);
      setLoading(false);
    };
    fetch();
  }, [chargeSlipNumber]);

  const handleSave = async () => {
    if (!record?.id) return;

    try {
      await updateChargeSlip(record.id, {
        dvNumber,
        orNumber,
        notes,
        status,
        dateOfOR, // Already a Timestamp
      });
      toast.success("Charge slip updated successfully.");
    } catch (error) {
      toast.error("Failed to update charge slip.");
    }
  };

  // Update dateOfOR automatically when OR No. is filled in
  useEffect(() => {
    if (orNumber.trim() && !dateOfOR) {
      setDateOfOR(Timestamp.now());
    }
  }, [orNumber]);

  if (loading || !record) return <p className="p-10">Loading...</p>;

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">
          Charge Slip #{record.chargeSlipNumber}
        </h1>
        <p className="text-muted-foreground text-sm">
          Issued on: {normalizeDate(record.dateIssued)}
        </p>
      </div>

      <div className="border rounded-md p-6 space-y-4 text-sm">
        <p><strong>Client Name:</strong> {record.clientInfo?.name}</p>
        <p><strong>Client ID:</strong> {record.cid}</p>
        <p><strong>Client Address:</strong> {record.clientInfo?.address || record.client?.affiliationAddress || "—"}</p>
        <p><strong>Project Title:</strong> {record.project?.title}</p>
        <p><strong>Project ID:</strong> {record.projectId}</p>
        <p><strong>Categories:</strong> {record.categories?.join(", ") || "—"}</p>
        <p><strong>Services:</strong> {record.services?.map(s => s.name).join(", ") || "—"}</p>
        <p><strong>Total:</strong> ₱{record.total.toLocaleString()}</p>
        <p><strong>Status:</strong></p>
        <Select value={status} onValueChange={(value) => setStatus(value as "processing" | "paid" | "cancelled")}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <div className="space-y-4 mt-6">
          <div>
            <label className="block text-sm font-medium mb-1">DV No.</label>
            <Input value={dvNumber} onChange={(e) => setDvNumber(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">OR No.</label>
            <Input value={orNumber} onChange={(e) => setOrNumber(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date of OR</label>
            <Input
              type="date"
              value={
                dateOfOR
                  ? new Date(dateOfOR.toDate()).toISOString().split("T")[0]
                  : ""
              }
              onChange={(e) => setDateOfOR(Timestamp.fromDate(new Date(e.target.value)))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="pt-4">
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </div>
    </div>
  );
}