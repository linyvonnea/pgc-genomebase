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

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

interface ServiceRequestedChartProps {
  projects: Array<{
    id: string;
    serviceRequested: string[];
    [key: string]: any;
  }>;
}

export function ServiceRequestedChart({ projects }: ServiceRequestedChartProps) {
  type ServiceCategory = "Laboratory Services" | "Equipment Use" | "Bioinformatics Analysis" | "Retail Sales";
  
  const serviceCounts: Record<ServiceCategory, number> = {
    "Laboratory Services": 0,
    "Equipment Use": 0,
    "Bioinformatics Analysis": 0,
    "Retail Sales": 0,
  };

  projects.forEach(project => {
    // Handle both array and single service cases
    const services = Array.isArray(project.serviceRequested) 
      ? project.serviceRequested 
      : [project.serviceRequested];
    
    services.forEach((service: string) => {
      if (service && service in serviceCounts) {
        serviceCounts[service as ServiceCategory] += 1;
      }
    });
  });

  const data = Object.entries(serviceCounts).map(([name, value]) => ({
    name,
    value
  }));

  return (
    <Card className="flex-1 min-w-0">
      <CardHeader className="flex flex-col items-center justify-center p-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">Service Requested</CardTitle>
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
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]} 
                    opacity={entry.value > 0 ? 1 : 0}
                  />
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
                wrapperStyle={{ fontSize: '12px' }}
                content={() => (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    gap: '8px',
                    flexWrap: 'wrap'
                  }}>
                    {Object.keys(serviceCounts).map((service, index) => (
                      <div 
                        key={service} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '4px',
                        }}
                      >
                        <div style={{
                          width: '12px',
                          height: '12px',
                          backgroundColor: COLORS[index % COLORS.length],
                          borderRadius: '2px'
                        }} />
                        <span style={{ fontSize: '12px' }}>{service}</span>
                      </div>
                    ))}
                  </div>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}