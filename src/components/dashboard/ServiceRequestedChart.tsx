"use client";

import { BasePieChart } from "./BasePieChart";
import { Project } from "@/types/Project";

const SERVICE_CATEGORIES = [
  "Laboratory Services",
  "Equipment Use",
  "Bioinformatics Analysis",
  "Retail Sales",
] as const;

type ServiceCategory = typeof SERVICE_CATEGORIES[number];

const CATEGORY_COLORS: Record<ServiceCategory, string> = {
  "Laboratory Services": "#F69122",
  "Equipment Use": "#B9273A",
  "Bioinformatics Analysis": "#912ABD",
  "Retail Sales": "#6E30BE",
};

// Type guard to check if a string is a ServiceCategory
function isServiceCategory(service: string): service is ServiceCategory {
  return SERVICE_CATEGORIES.includes(service as ServiceCategory);
}

export function ServiceRequestedChart({ projects }: { projects: Project[] }) {
  const serviceCounts = SERVICE_CATEGORIES.reduce((acc, category) => {
    acc[category] = 0;
    return acc;
  }, {} as Record<ServiceCategory, number>);

  projects.forEach((project) => {
    const services = Array.isArray(project.serviceRequested)
      ? project.serviceRequested
      : project.serviceRequested
      ? [project.serviceRequested]
      : [];
    
    services.forEach((service) => {
      if (service && isServiceCategory(service)) {
        serviceCounts[service] += 1;
      }
    });
  });

  const data = SERVICE_CATEGORIES.map((category) => ({
    name: category,
    value: serviceCounts[category],
  }));

  return (
    <BasePieChart
      title="Service Requested"
      categories={SERVICE_CATEGORIES}
      colors={CATEGORY_COLORS}
      data={data}
      emptyMessage="No data available"
    />
  );
}