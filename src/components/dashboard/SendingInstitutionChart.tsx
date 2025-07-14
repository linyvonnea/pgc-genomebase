"use client";

import { BasePieChart } from "./BasePieChart";
import { Project } from "@/types/Project";

// Match exactly with Project interface's sendingInstitution type
const INSTITUTION_CATEGORIES: readonly ("UP System" | "SUC/HEI" | "Government" | "Private/Local" | "International" | "N/A")[] = [
  "UP System",
  "SUC/HEI",
  "Government",
  "Private/Local",
  "International",
  "N/A"
] as const;

type InstitutionCategory = typeof INSTITUTION_CATEGORIES[number];

const CATEGORY_COLORS: Record<InstitutionCategory, string> = {
  "UP System": "#F69122",
  "SUC/HEI": "#B9273A",
  "Government": "#912ABD",
  "Private/Local": "#6E30BE",
  "International": "#633190",
  "N/A": "#166FB5"
};

export function SendingInstitutionChart({ projects }: { projects: Project[] }) {
  // Initialize counts for all categories
  const institutionCounts = INSTITUTION_CATEGORIES.reduce((acc, category) => {
    acc[category] = 0;
    return acc;
  }, {} as Record<InstitutionCategory, number>);

  projects.forEach((project) => {
    const institution = project.sendingInstitution;
    if (institution && INSTITUTION_CATEGORIES.includes(institution)) {
      institutionCounts[institution] += 1;
    }
  });

  const data = INSTITUTION_CATEGORIES.map((category) => ({
    name: category,
    value: institutionCounts[category],
  }));

  return (
    <BasePieChart
      title="Sending Institution"
      categories={INSTITUTION_CATEGORIES}
      colors={CATEGORY_COLORS}
      data={data}
      emptyMessage="No data available"
    />
  );
}