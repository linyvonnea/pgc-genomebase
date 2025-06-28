// src/components/forms/ClientForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clientSchema, ClientFormData } from "@/schemas/clientSchema";

export default function ClientForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
  });

  const onSubmit = (data: ClientFormData) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input placeholder="Name" {...register("name")} />
      {errors.name && <p>{errors.name.message}</p>}

      <input placeholder="Email" {...register("email")} />
      {errors.email && <p>{errors.email.message}</p>}

      <input placeholder="Institution" {...register("institution")} />
      {errors.institution && <p>{errors.institution.message}</p>}

      <input placeholder="Designation" {...register("designation")} />

      <select {...register("sex")}>
        <option value="Male">Male</option>
        <option value="Female">Female</option>
        <option value="Other">Other</option>
      </select>

      <input placeholder="Mobile Number" {...register("mobileNumber")} />
      {errors.mobileNumber && <p>{errors.mobileNumber.message}</p>}

      <input placeholder="Mailing Address" {...register("mailingAddress")} />

      <button type="submit">Submit</button>
    </form>
  );
}
