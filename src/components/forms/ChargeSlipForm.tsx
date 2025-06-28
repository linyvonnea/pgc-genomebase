// src/components/forms/ChargeSlipForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { chargeSlipSchema, ChargeSlipFormData } from "@/schemas/chargeSlipSchema";

export default function ChargeSlipForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChargeSlipFormData>({
    resolver: zodResolver(chargeSlipSchema),
  });

  const onSubmit = (data: ChargeSlipFormData) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input placeholder="Project ID" {...register("projectId")} />
      <input placeholder="Prepared By" {...register("preparedBy")} />
      <input type="date" {...register("dateIssued", { valueAsDate: true })} />
      <input placeholder="Remarks" {...register("remarks")} />
      <input type="number" placeholder="Amount" {...register("amount", { valueAsNumber: true })} />
      <button type="submit">Submit</button>
    </form>
  );
}
