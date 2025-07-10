// src/components/dashboard/charts/FundingCategoryChart.tsx
"use client";

import * as React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend
} from "recharts";
import { EmptyData } from "./EmptyData";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

interface FundingCategoryChartProps {
  projects: any[];
}

export function FundingCategoryChart({ projects }: FundingCategoryChartProps) {
  const fundingCategoryMap: Record<string, string> = {
    "In-House": "In-House",
    "External": "External" 
  };
  
  type FundingCategory = keyof typeof fundingCategoryMap;
  
  const fundingCounts: Record<FundingCategory, number> = {
    "In-House": 0,
    "External": 0,
  };

  projects.forEach(project => {
    const fundingCategory = project.fundingCategory;
    const mappedCategory = Object.entries(fundingCategoryMap).find(
      ([key]) => key === fundingCategory
    )?.[1] as FundingCategory | undefined;

    if (mappedCategory && mappedCategory in fundingCounts) {
      fundingCounts[mappedCategory] += 1;
    }
  });

  const data = Object.entries(fundingCounts)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({
      name,
      value
    }));
  
  if (data.length === 0) {
    return (
      <Card className="flex-1 min-w-0">
        <CardHeader className="flex flex-col items-center justify-center p-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">Funding Category</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="h-[300px]">
            <EmptyData />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex-1 min-w-0">
      <CardHeader className="flex flex-col items-center justify-center p-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">Funding Category</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ value }) => `${value}`}
                outerRadius={80}
                fill="#8884d8"
                stroke="none"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  fontSize: '14px',
                  fontWeight: 500,
                  padding: '8px 12px',
                }}
                itemStyle={{
                  color: '#1f2937',
                  padding: '2px 0',
                }}
                formatter={(value: number, name: string) => [
                  <span key="combined" className="flex items-center gap-2">
                    <span className="text-gray-600">{name}</span>
                    <span className="font-semibold">{value}</span>
                  </span>,
                  null
                ]}
              />
              <Legend 
                iconSize={12}
                wrapperStyle={{
                  fontSize: '12px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}