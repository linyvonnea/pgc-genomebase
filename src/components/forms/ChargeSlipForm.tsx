// src/components/forms/ChargeSlipForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { chargeSlipSchema, ChargeSlipFormData } from "@/schemas/chargeSlipSchema";

export default function ChargeSlipForm({ onSubmit }: { onSubmit: (data: ChargeSlipFormData) => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChargeSlipFormData>({
    resolver: zodResolver(chargeSlipSchema),
    defaultValues: {
      amount: 0,
    },
  });

  const handleFormSubmit = (data: ChargeSlipFormData) => {
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)}>
      {/* Removed the `amount` input field from ChargeSlipForm */}
    </form>
  );
}
