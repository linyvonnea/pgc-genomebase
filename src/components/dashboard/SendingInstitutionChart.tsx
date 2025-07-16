"use client";

/**
 * Pie chart showing the distribution of projects by sending institution type.
 */

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

// Colors for each category in the pie chart
const CATEGORY_COLORS: Record<InstitutionCategory, string> = {
  "UP System": "#F06292",         
  "SUC/HEI": "#FFB74D",           
  "Government": "#FFF176",       
  "Private/Local": "#81C784",  
  "International": "#64B5F6",    
  "N/A": "#BA68C8",             
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

  // Prepare data for the pie chart
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