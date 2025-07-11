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

const COLORS = [
  "#F69122",
  "#B9273A",
  "#912ABD",
  "#6E30BE",
  "#633190",
  "#40388F",
  "#166FB5"
];

interface StatisticsBarChartProps {
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

  const toDate = (timestamp: any) => {
    if (timestamp?.toDate) {
      return timestamp.toDate();
    }
    return new Date(timestamp);
  };

  const generateAllTimePeriods = (period: string, count: number = 12) => {
    const now = new Date();
    const periods: string[] = [];

    if (period === 'hour') {
      for (let i = 0; i < 24; i++) {
        periods.push(`${i}:00`);
      }
    } else if (period === 'day') {
      for (let i = 0; i < count; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        periods.unshift(date.toLocaleDateString('en-US', { weekday: 'short' }));
      }
    } else if (period === 'week') {
      for (let i = 0; i < count; i++) {
        periods.unshift(`Week ${i + 1}`);
      }
    } else if (period === 'month') {
      for (let i = 0; i < count; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        periods.unshift(date.toLocaleDateString('en-US', { month: 'short' }));
      }
    } else if (period === 'year') {
      for (let i = 0; i < count; i++) {
        periods.unshift((now.getFullYear() - i).toString());
      }
    }

    return periods;
  };

  const countByTimePeriod = (items: any[], dateKey: string, period: string) => {
    const counts: Record<string, number> = {};
    const allPeriods = generateAllTimePeriods(period, period === 'day' ? 7 : 12);
    
    allPeriods.forEach(p => {
      counts[p] = 0;
    });

    items.forEach(item => {
      const date = toDate(item[dateKey]);
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
      
      if (periodKey in counts) {
        counts[periodKey] += 1;
      }
    });
    
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  };

  const generateChartData = () => {
    const now = new Date();
    let filteredProjects = [...projectsData];
    let filteredClients = [...clientsData];
    let filteredTrainings = [...trainingsData];
    
    if (timeRange === "today") {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      filteredProjects = filteredProjects.filter(p => toDate(p.startDate) >= todayStart);
      filteredClients = filteredClients.filter(c => toDate(c.createdAt) >= todayStart);
      filteredTrainings = filteredTrainings.filter(t => toDate(t.dateConducted) >= todayStart);
    } 
    else if (timeRange === "weekly") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filteredProjects = filteredProjects.filter(p => toDate(p.startDate) >= weekAgo);
      filteredClients = filteredClients.filter(c => toDate(c.createdAt) >= weekAgo);
      filteredTrainings = filteredTrainings.filter(t => toDate(t.dateConducted) >= weekAgo);
    }
    else if (timeRange === "monthly") {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      filteredProjects = filteredProjects.filter(p => toDate(p.startDate) >= monthAgo);
      filteredClients = filteredClients.filter(c => toDate(c.createdAt) >= monthAgo);
      filteredTrainings = filteredTrainings.filter(t => toDate(t.dateConducted) >= monthAgo);
    }
    else if (timeRange === "yearly") {
      const yearAgo = new Date();
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      filteredProjects = filteredProjects.filter(p => toDate(p.startDate) >= yearAgo);
      filteredClients = filteredClients.filter(c => toDate(c.createdAt) >= yearAgo);
      filteredTrainings = filteredTrainings.filter(t => toDate(t.dateConducted) >= yearAgo);
    }
    else if (timeRange === "custom" && customRange) {
      filteredProjects = filteredProjects.filter(p => {
        const date = toDate(p.startDate);
        return (
          date.getFullYear() === customRange.year &&
          date.getMonth() >= customRange.startMonth &&
          date.getMonth() <= customRange.endMonth
        );
      });
      filteredClients = filteredClients.filter(c => {
        const date = toDate(c.createdAt);
        return (
          date.getFullYear() === customRange.year &&
          date.getMonth() >= customRange.startMonth &&
          date.getMonth() <= customRange.endMonth
        );
      });
      filteredTrainings = filteredTrainings.filter(t => {
        const date = toDate(t.dateConducted);
        return (
          date.getFullYear() === customRange.year &&
          date.getMonth() >= customRange.startMonth &&
          date.getMonth() <= customRange.endMonth
        );
      });
    }

    switch(timeRange) {
      case "today":
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        return [{
          name: "Today",
          projects: filteredProjects.length,
          clients: filteredClients.length,
          trainings: filteredTrainings.length
        }];
        
      case "weekly":
        const dailyProjects = countByTimePeriod(filteredProjects, 'startDate', 'day');
        const dailyClients = countByTimePeriod(filteredClients, 'createdAt', 'day');
        const dailyTrainings = countByTimePeriod(filteredTrainings, 'dateConducted', 'day');
        return dailyProjects.map((day, i) => ({
          name: day.name,
          projects: day.count,
          clients: dailyClients[i]?.count || 0,
          trainings: dailyTrainings[i]?.count || 0
        }));
        
      case "monthly": 
        const dailyCounts = [];
        const today = new Date();
        
        for (let i = 29; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          
          const dayLabel = date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          });

          dailyCounts.push({
            name: dayLabel, 
            projects: filteredProjects.filter(p => {
              const pDate = toDate(p.startDate);
              return pDate.toDateString() === date.toDateString();
            }).length,
            clients: filteredClients.filter(c => {
              const cDate = toDate(c.createdAt);
              return cDate.toDateString() === date.toDateString();
            }).length,
            trainings: filteredTrainings.filter(t => {
              const tDate = toDate(t.dateConducted);
              return tDate.toDateString() === date.toDateString();
            }).length
          });
        }
        return dailyCounts;
        
      case "yearly":
        const monthlyProjects = countByTimePeriod(filteredProjects, 'startDate', 'month');
        const monthlyClients = countByTimePeriod(filteredClients, 'createdAt', 'month');
        const monthlyTrainings = countByTimePeriod(filteredTrainings, 'dateConducted', 'month');
        return monthlyProjects.map((month, i) => ({
          name: month.name,
          projects: month.count,
          clients: monthlyClients[i]?.count || 0,
          trainings: monthlyTrainings[i]?.count || 0
        }));
        
      case "all":
        const yearlyProjects = countByTimePeriod(filteredProjects, 'startDate', 'year');
        const yearlyClients = countByTimePeriod(filteredClients, 'createdAt', 'year');
        const yearlyTrainings = countByTimePeriod(filteredTrainings, 'dateConducted', 'year');
        return yearlyProjects.map((year, i) => ({
          name: year.name,
          projects: year.count,
          clients: yearlyClients[i]?.count || 0,
          trainings: yearlyTrainings[i]?.count || 0
        }));
        
      case "custom":
      if (!customRange) return [];
        const customMonths = [];
        for (let i = customRange.startMonth; i <= customRange.endMonth; i++) {
          customMonths.push(months[i]);
        }

        return customMonths.map(month => ({
          name: month,
          projects: filteredProjects.filter(p => {
            const date = toDate(p.startDate);
            return (
              date.getFullYear() === customRange.year &&
              months[date.getMonth()] === month
            );
          }).length,
          clients: filteredClients.filter(c => {
            const date = toDate(c.createdAt);
            return (
              date.getFullYear() === customRange.year &&
              months[date.getMonth()] === month
            );
          }).length,
          trainings: filteredTrainings.filter(t => {
            const date = toDate(t.dateConducted);
            return (
              date.getFullYear() === customRange.year &&
              months[date.getMonth()] === month
            );
          }).length
        }));
        
      default:
        return [{
          name: "Overview",
          projects: filteredProjects.length,
          clients: filteredClients.length,
          trainings: filteredTrainings.length
        }];
    }
  };

  const data = generateChartData();

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
              margin={{ left: -35 }} 
            >
              <CartesianGrid vertical={false}/>
              <XAxis 
                dataKey="name"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickMargin={12}
              />
              <YAxis 
                allowDecimals={false}
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
                fill={COLORS[0]} 
                name="Clients" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="projects" 
                fill={COLORS[1]} 
                name="Projects" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="trainings" 
                fill={COLORS[2]} 
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