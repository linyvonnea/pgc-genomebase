"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Project } from "@/types/Project"
import { projectSchema } from "@/schemas/projectSchema"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"


export const columns: ColumnDef<Project>[] = [
  {
    accessorKey: "year",
    header: "Year",
  },
  {
    accessorKey: "startDate",
    header: "Start Date",
  },
  // {
  //   accessorKey: "endDate",
  //   header: "End Date",
  // },
  {
    accessorKey: "clientNames",
    header: "Client Names",
    cell: ({ row }) => {
      const names = row.original.clientNames;
      return names && names.length > 0 ? names.join(", ") : "";
    },
    //  enables global filtering by converting the array to a string
    filterFn: (row, columnId, filterValue) => {
      const value: string[] = row.getValue(columnId) || [];
      return value.join(", ").toLowerCase().includes(filterValue.toLowerCase());
    },
  },
  {
    accessorKey: "lead",
    header: "Project Lead",
  },
  {
    accessorKey: "pid",
    header: "Project ID",
  },
    {
    accessorKey: "iid",
    header: "Inquiry ID",
    size: 80,
    cell: ({ row }) => (
      <span className="block max-w-[80px] break-words whitespace-normal">{row.original.iid}</span>
    ),
  },
  {
    accessorKey: "title",
    header: "Project Title",
  },
  {
    accessorKey: "projectTag",
    header: "Project Tag",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      let color = "bg-gray-100 text-gray-800";
      let label: string = status || "";
      switch (status) {
        case "Ongoing":
          color = "bg-yellow-100 text-yellow-800";
          label = "Ongoing";
          break;
        case "Completed":
          color = "bg-green-100 text-green-800";
          label = "Completed";
          break;
        case "Cancelled":
          color = "bg-red-100 text-red-800";
          label = "Cancelled";
          break;
        default:
          color = "bg-gray-100 text-gray-800";
          label = status || "";
      }
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${color}`}>
          {label}
        </span>
      );
    },
  },
  {
    accessorKey: "sendingInstitution",
    header: "Sending Institution",
    cell: ({ row }) => {
      const value = row.original.sendingInstitution;
      let color = "bg-gray-100 text-gray-800";
      switch (value) {
        case "UP System": color = "bg-blue-100 text-blue-800"; break;
        case "SUC/HEI": color = "bg-green-100 text-green-800"; break;
        case "Government": color = "bg-yellow-100 text-yellow-800"; break;
        case "Private/Local": color = "bg-purple-100 text-purple-800"; break;
        case "International": color = "bg-pink-100 text-pink-800"; break;
        case "N/A": color = "bg-gray-200 text-gray-600"; break;
      }
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${color}`}>
          {value}
        </span>
      );
    },
  },
  {
    accessorKey: "fundingCategory",
    header: "Funding Category",
    cell: ({ row }) => {
      const value = row.original.fundingCategory;
      let color = "bg-gray-100 text-gray-800";
      if (value === "External") color = "bg-orange-100 text-orange-800";
      if (value === "In-House") color = "bg-indigo-100 text-indigo-800";
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${color}`}>
          {value || ""}
        </span>
      );
    },
  },
  {
    accessorKey: "fundingInstitution",
    header: "Funding Institution",
  },
  {
    accessorKey: "serviceRequested",
    header: "Service Requested",
    cell: ({ row }) => {
      const services = row.original.serviceRequested
      return services && services.length > 0 ? services.join(", ") : ""
    },
  },
  {
    accessorKey: "personnelAssigned",
    header: "Personnel Assigned",
  },
  {
    accessorKey: "notes",
    header: "Notes",
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const project = row.original;
      const EditProjectModal = require("@/components/forms/EditProjectModal").EditProjectModal;
      const router = useRouter();
      return (
        <div className="flex items-center gap-2">
          <EditProjectModal project={project} onSuccess={() => {}} />
          <Button
            onClick={() => router.push(`/admin/charge-slip`)}
            variant="outline"
            className="text-sm"
          >
            Charge Slip
          </Button>
        </div>
      );
    },
  },
]
