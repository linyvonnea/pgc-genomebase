import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmationModalProps {
  open: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationModal({
  open,
  title = "Please double check before saving",
  description = "Review your entries carefully. Once saved, changes may be difficult to undo.",
  confirmText = "Confirm & Save",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="max-w-md rounded-2xl shadow-xl border border-slate-100 bg-white/90">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800 mb-2">
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="text-slate-700 mb-6">
          {description}
        </div>
        <DialogFooter className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onCancel} className="h-10 px-6">
            {cancelText}
          </Button>
          <Button onClick={onConfirm} className="h-10 px-6 bg-gradient-to-r from-[#F69122] via-[#B9273A] to-[#912ABD] text-white font-semibold">
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
