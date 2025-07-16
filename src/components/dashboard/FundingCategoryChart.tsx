"use client";

import { BasePieChart } from "./BasePieChart";
import { Project } from "@/types/Project";

// Match exactly with Project interface's fundingCategory type
const FUNDING_CATEGORIES: readonly ("External" | "In-House")[] = [
  "In-House",
  "External"
] as const;

type FundingCategory = typeof FUNDING_CATEGORIES[number];

const CATEGORY_COLORS: Record<FundingCategory, string> = {
  "In-House": "#166FB5",
  "External": "#633190 ",
};

export function FundingCategoryChart({ projects }: { projects: Project[] }) {
  const fundingCounts = FUNDING_CATEGORIES.reduce((acc, category) => {
    acc[category] = 0;
    return acc;
  }, {} as Record<FundingCategory, number>);

  projects.forEach((project) => {
    const category = project.fundingCategory;
    if (category && FUNDING_CATEGORIES.includes(category)) {
      fundingCounts[category] += 1;
    }
  });

  const data = FUNDING_CATEGORIES.map((category) => ({
    name: category,
    value: fundingCounts[category],
  }));

  return (
    <BasePieChart
      title="Funding Category"
      categories={FUNDING_CATEGORIES}
      colors={CATEGORY_COLORS}
      data={data}
      emptyMessage="No data available"
      legendWrapperStyle={{ justifyContent: 'center', paddingBottom: '28px' }}
    />
  );
}