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
import { EmptyData } from "./EmptyData";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

interface StatisticsBarChartProps {
  projectsData: any[];
  clientsData: any[];
  timeRange: string;
  customRange?: { year: number; startMonth: number; endMonth: number };
}

export function StatBarChart({ 
  projectsData, 
  clientsData,
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

  const countByTimePeriod = (items: any[], dateKey: string, period: string) => {
    const counts: Record<string, number> = {};
    
    items.forEach(item => {
      const date = new Date(item[dateKey].value);
      let periodKey = '';
      
      switch(period) {
        case 'hour':
          periodKey = `${date.getHours()}:00`;
          break;
        case 'day':
          periodKey = date.toLocaleDateString('en-US', { weekday: 'short' });
          break;
        case 'week':
          const weekNum = Math.floor(date.getDate() / 7) + 1;
          periodKey = `Week ${weekNum}`;
          break;
        case 'month':
          periodKey = date.toLocaleDateString('en-US', { month: 'short' });
          break;
        case 'year':
          periodKey = date.getFullYear().toString();
          break;
      }
      
      counts[periodKey] = (counts[periodKey] || 0) + 1;
    });
    
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  };

  const generateChartData = () => {
    const now = new Date();
    let filteredProjects = [...projectsData];
    let filteredClients = [...clientsData];
    
    if (timeRange === "today") {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      filteredProjects = filteredProjects.filter(p => new Date(p.startDate.value) >= todayStart);
      filteredClients = filteredClients.filter(c => new Date(c.dateReceived.value) >= todayStart);
    } 
    else if (timeRange === "weekly") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filteredProjects = filteredProjects.filter(p => new Date(p.startDate.value) >= weekAgo);
      filteredClients = filteredClients.filter(c => new Date(c.dateReceived.value) >= weekAgo);
    }
    else if (timeRange === "monthly") {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      filteredProjects = filteredProjects.filter(p => new Date(p.startDate.value) >= monthAgo);
      filteredClients = filteredClients.filter(c => new Date(c.dateReceived.value) >= monthAgo);
    }
    else if (timeRange === "yearly") {
      const yearAgo = new Date();
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      filteredProjects = filteredProjects.filter(p => new Date(p.startDate.value) >= yearAgo);
      filteredClients = filteredClients.filter(c => new Date(c.dateReceived.value) >= yearAgo);
    }
    else if (timeRange === "custom" && customRange) {
      filteredProjects = filteredProjects.filter(p => {
        const date = new Date(p.startDate.value);
        return (
          date.getFullYear() === customRange.year &&
          date.getMonth() >= customRange.startMonth &&
          date.getMonth() <= customRange.endMonth
        );
      });
      filteredClients = filteredClients.filter(c => {
        const date = new Date(c.dateReceived.value);
        return (
          date.getFullYear() === customRange.year &&
          date.getMonth() >= customRange.startMonth &&
          date.getMonth() <= customRange.endMonth
        );
      });
    }

    switch(timeRange) {
      case "today":
        const hourlyProjects = countByTimePeriod(filteredProjects, 'startDate', 'hour');
        const hourlyClients = countByTimePeriod(filteredClients, 'dateReceived', 'hour');
        return hourlyProjects.map((hour, i) => ({
          name: hour.name,
          projects: hour.count,
          clients: hourlyClients[i]?.count || 0,
          trainings: 0
        }));
        
      case "weekly":
        const dailyProjects = countByTimePeriod(filteredProjects, 'startDate', 'day');
        const dailyClients = countByTimePeriod(filteredClients, 'dateReceived', 'day');
        return dailyProjects.map((day, i) => ({
          name: day.name,
          projects: day.count,
          clients: dailyClients[i]?.count || 0,
          trainings: 0
        }));
        
      case "monthly":
        const weeklyProjects = countByTimePeriod(filteredProjects, 'startDate', 'week');
        const weeklyClients = countByTimePeriod(filteredClients, 'dateReceived', 'week');
        return weeklyProjects.map((week, i) => ({
          name: week.name,
          projects: week.count,
          clients: weeklyClients[i]?.count || 0,
          trainings: 0
        }));
        
      case "yearly":
        const monthlyProjects = countByTimePeriod(filteredProjects, 'startDate', 'month');
        const monthlyClients = countByTimePeriod(filteredClients, 'dateReceived', 'month');
        return monthlyProjects.map((month, i) => ({
          name: month.name,
          projects: month.count,
          clients: monthlyClients[i]?.count || 0,
          trainings: 0
        }));
        
      case "all":
        const yearlyProjects = countByTimePeriod(filteredProjects, 'startDate', 'year');
        const yearlyClients = countByTimePeriod(filteredClients, 'dateReceived', 'year');
        return yearlyProjects.map((year, i) => ({
          name: year.name,
          projects: year.count,
          clients: yearlyClients[i]?.count || 0,
          trainings: 0
        }));
        
      case "custom":
        const customProjects = countByTimePeriod(filteredProjects, 'startDate', 'month');
        const customClients = countByTimePeriod(filteredClients, 'dateReceived', 'month');
        return customProjects.map((month, i) => ({
          name: month.name,
          projects: month.count,
          clients: customClients[i]?.count || 0,
          trainings: 0
        }));
        
      default:
        return [{
          name: "Overview",
          projects: filteredProjects.length,
          clients: filteredClients.length,
          trainings: 0
        }];
    }
  };

  const data = generateChartData();

  const isEmpty = data.every(item => 
    item.projects === 0 && item.clients === 0 && item.trainings === 0
  );

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-col items-center justify-center p-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {timeRange === "custom" && customRange 
            ? `${months[customRange.startMonth]} - ${months[customRange.endMonth]} ${customRange.year}`
            : timeRangeLabels[timeRange as keyof typeof timeRangeLabels]}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="h-[300px]">
          {isEmpty ? (
            <EmptyData />
          ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 5, right: 20, left: 5, bottom: 20 }}
            >
              <CartesianGrid vertical={false}/>
              <XAxis 
                dataKey="name"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickMargin={12}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#6b7280' }}
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
                    <span className="font-semibold">{value}</span>
                  </span>,
                  null
                ]}
                />
              <Legend 
                iconSize={12}
                wrapperStyle={{
                  fontSize: '12px',
                  justifyContent: 'center',
                }}
              />
              <Bar dataKey="projects" fill="#0088FE" name="Projects" />
              <Bar dataKey="clients" fill="#00C49F" name="Clients" />
              <Bar dataKey="trainings" fill="#FFBB28" name="Trainings" />
            </BarChart>
          </ResponsiveContainer> 
          )}
        </div> 
      </CardContent>
    </Card>
  );
}