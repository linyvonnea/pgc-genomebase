import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmationModalLayoutProps {
  open: boolean;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmationModalLayout({
  open,
  title = "Please double check before saving",
  description = "Review your entries below before confirming. This action cannot be undone.",
  children,
  confirmLabel = "Confirm & Save",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmationModalLayoutProps) {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="max-w-md bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-100">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-[#166FB5] to-[#4038AF] bg-clip-text text-transparent">
            {title}
          </DialogTitle>
          <DialogDescription className="text-slate-700 mt-2">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="my-4">{children}</div>
        <DialogFooter className="flex gap-3 justify-end pt-4">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm} disabled={loading} className="bg-gradient-to-r from-[#166FB5] to-[#4038AF] text-white font-semibold">
            {loading ? "Saving..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
