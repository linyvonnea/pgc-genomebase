// src/components/forms/QuotationForm.tsx
"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { quotationSchema, QuotationFormData } from "@/schemas/quotationSchema";

export default function QuotationForm() {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<QuotationFormData>({
    resolver: zodResolver(quotationSchema),
    defaultValues: { items: [], generatedAt: new Date(), status: "draft" },
  });

  const { fields, append } = useFieldArray({
    control,
    name: "items",
  });

  const onSubmit = (data: QuotationFormData) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input placeholder="Client ID" {...register("clientId")} />
      <select {...register("type")}>
        <option value="Laboratory">Laboratory</option>
        <option value="Equipment">Equipment</option>
      </select>

      {fields.map((field, index) => (
        <div key={field.id}>
          <input placeholder="Service Name" {...register(`items.${index}.serviceName`)} />
          <input type="number" placeholder="Quantity" {...register(`items.${index}.quantity`, { valueAsNumber: true })} />
          <input placeholder="Unit" {...register(`items.${index}.unit`)} />
          <input type="number" placeholder="Unit Cost" {...register(`items.${index}.unitCost`, { valueAsNumber: true })} />
          <input type="number" placeholder="Subtotal" {...register(`items.${index}.subtotal`, { valueAsNumber: true })} />
        </div>
      ))}

      <button type="button" onClick={() => append({ serviceName: "", quantity: 1, unit: "", unitCost: 0, subtotal: 0 })}>
        Add Item
      </button>

      <input type="number" placeholder="Total" {...register("total", { valueAsNumber: true })} />

      <select {...register("status")}>
        <option value="draft">Draft</option>
        <option value="submitted">Submitted</option>
        <option value="reviewed">Reviewed</option>
        <option value="approved">Approved</option>
      </select>

      <input type="date" {...register("generatedAt", { valueAsDate: true })} />

      <button type="submit">Submit</button>
    </form>
  );
}