// src/components/dashboard/charts/SendingInstitutionChart.tsx
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

interface SendingInstitutionChartProps {
  projects: any[];
}

export function SendingInstitutionChart({ projects }: SendingInstitutionChartProps) {
  const institutionMap: Record<string, string> = {
    "UP System": "UP System",
    "SUC/HEI": "SUC/HEI",
    "Government": "Government",
    "Private/Local": "Private/Local",
    "International": "International"
  };
  
  type InstitutionCategory = keyof typeof institutionMap;
  
  const sendingCounts: Record<InstitutionCategory, number> = {
    "UP System": 0,
    "SUC/HEI": 0,
    "Government": 0,
    "Private/Local": 0,
    "International": 0
  };

  projects.forEach(project => {
    const sendingInstitution = project.sendingInstitution;
    const mappedCategory = Object.entries(institutionMap).find(
      ([key]) => key === sendingInstitution
    )?.[1] as InstitutionCategory | undefined;

    if (mappedCategory && mappedCategory in sendingCounts) {
      sendingCounts[mappedCategory] += 1;
    }
  });

  const data = Object.entries(sendingCounts)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({
      name,
      value
    }));
  
  if (data.length === 0) {
    return (
      <Card className="flex-1 min-w-0">
        <CardHeader className="flex flex-col items-center justify-center p-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">Sending Institution</CardTitle>
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
        <CardTitle className="text-sm font-medium text-muted-foreground">Sending Institution</CardTitle>
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
                stroke="none"
                outerRadius={80}
                fill="#8884d8"
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