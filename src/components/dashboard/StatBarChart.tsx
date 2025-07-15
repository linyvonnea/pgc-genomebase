// src/components/dashboard/charts/StatBarChart.tsx
"use client";

import * as React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { generateChartData } from "@/services/filterGraph";

const CATEGORY_COLORS = {
  CLIENTS: "#166FB5",  
  PROJECTS: "#633190",
  TRAININGS: "#912ABD" 
} as const;

export interface StatisticsBarChartProps {
  projectsData: any[];
  clientsData: any[];
  trainingsData: any[];
  timeRange: string;
  customRange?: { year: number; startMonth: number; endMonth: number };
}

export function StatBarChart({ 
  projectsData, 
  clientsData,
  trainingsData,
  timeRange,
  customRange
}: StatisticsBarChartProps) {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const timeRangeLabels = {
    all: "All Time",
    today: "Today",
    weekly: "Last 7 Days",
    monthly: "Last 30 Days",
    yearly: "Last 12 Months",
    custom: "Custom Range"
  };

  const data = generateChartData({
    projectsData,
    clientsData,
    trainingsData,
    timeRange,
    customRange
  });

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-col items-center justify-center p-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {timeRange === "custom" && customRange 
            ? `${months[customRange.startMonth]} - ${months[customRange.endMonth]} ${customRange.year}`
            : timeRangeLabels[timeRange as keyof typeof timeRangeLabels]}
        </CardTitle>
      </CardHeader>
      <CardContent className="">
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ left: -25 }} 
            >
              <CartesianGrid vertical={false}/>
              <XAxis 
                dataKey="name"
                tick={{ fontSize: 12 }}
                tickMargin={12}
              />
              <YAxis 
                allowDecimals={false}
                tick={{ fontSize: 12 }}
                tickMargin={12}
              />
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
                    <span 
                      className="font-semibold"
                      style={{ 
                        color: name === 'Clients' ? CATEGORY_COLORS.CLIENTS :
                               name === 'Projects' ? CATEGORY_COLORS.PROJECTS :
                               CATEGORY_COLORS.TRAININGS
                      }}
                    >
                      {value}
                    </span>
                  </span>,
                  null
                ]}
              />
              <Legend 
                iconSize={12}
                wrapperStyle={{
                  fontSize: '12px',
                  paddingTop: '10px',
                  paddingBottom: '10px',
                }}
                content={({ payload }) => (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '16px', 
                    width: '100%', 
                    margin: '0 auto', 
                  }}>
                    {payload?.map((entry, index) => {
                      return (
                        <div 
                          key={`legend-item-${index}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <div style={{
                            width: '12px',
                            height: '12px',
                            backgroundColor: entry.color,
                            borderRadius: '2px'
                          }} />
                          <span style={{ 
                            fontSize: '12px',
                          }}>
                            {entry.value}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              />
              <Bar 
                dataKey="clients" 
                fill={CATEGORY_COLORS.CLIENTS} 
                name="Clients" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="projects" 
                fill={CATEGORY_COLORS.PROJECTS} 
                name="Projects" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="trainings" 
                fill={CATEGORY_COLORS.TRAININGS} 
                name="Trainings" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer> 
        </div> 
      </CardContent>
    </Card>
  );
}