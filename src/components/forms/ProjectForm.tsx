// src/components/forms/ProjectForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { projectSchema, ProjectFormData } from "@/schemas/projectSchema";

export default function ProjectForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
  });

  const onSubmit = (data: ProjectFormData) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input placeholder="Client ID" {...register("clientId")} />
      <input placeholder="Title" {...register("title")} />
      <input placeholder="Description" {...register("description")} />

      <select {...register("status")}> 
        <option value="pending">Pending</option>
        <option value="ongoing">Ongoing</option>
        <option value="completed">Completed</option>
      </select>

      <input type="date" {...register("startDate", { valueAsDate: true })} />
      <input type="date" {...register("endDate", { valueAsDate: true })} />

      <button type="submit">Submit</button>
    </form>
  );
}
