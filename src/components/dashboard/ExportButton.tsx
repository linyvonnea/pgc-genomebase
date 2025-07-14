//src/components/dashboard/ExportButton.tsx
import { Button } from "@/components/ui/button";

interface ExportButtonProps {
  onClick: () => void;
  disabled: boolean;
}

export function ExportButton({ onClick, disabled }: ExportButtonProps) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className="w-[160px] text-left truncate"
    >
      {disabled ? "Generating..." : "Export as PDF"}
    </Button>
  );
}
