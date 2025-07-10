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
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import clients from "@/mock/clients.json";
import projects from "@/mock/projects.json";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

function TimeFilter({ onFilterChange }: { onFilterChange: (value: string | { year: number; startMonth: number; endMonth: number }) => void }) {
  const [timeRange, setTimeRange] = React.useState<keyof typeof timeRangeLabels>("all");
  const [year, setYear] = React.useState(new Date().getFullYear());
  const [startMonth, setStartMonth] = React.useState(0);
  const [endMonth, setEndMonth] = React.useState(11);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const timeRangeLabels = {
    all: "All Time",
    today: "Today",
    weekly: "Weekly",
    monthly: "Monthly",
    yearly: "Yearly",
    custom: "Custom"
  };

  const handleRangeChange = () => {
    onFilterChange({ year, startMonth, endMonth });
  };

  return (
    <div className="flex items-center gap-2 ml-6">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="min-w-[150px]">
            Timeline: {timeRangeLabels[timeRange]}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Time Range</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup 
            value={timeRange} 
            onValueChange={(value) => {
              const range = value as keyof typeof timeRangeLabels;
              setTimeRange(range);
              if (range !== "custom") {
                onFilterChange(value);
              }
            }}
          >
            <DropdownMenuRadioItem value="all">All Time</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="today">Today</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="weekly">Weekly</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="monthly">Monthly</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="yearly">Yearly</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="custom">Custom</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {timeRange === "custom" && (
        <div className="flex items-center gap-2">
          {/* Year Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-[120px]">
                Year: {year}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              <DropdownMenuLabel>Select Year</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={year.toString()}
                onValueChange={(value) => {
                  setYear(Number(value));
                  handleRangeChange();
                }}
              >
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                  <DropdownMenuRadioItem 
                    key={y}
                    value={y.toString()}
                  >
                    {y}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Start Month Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-[140px]">
                From: {months[startMonth]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              <DropdownMenuLabel>Start Month</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={startMonth.toString()}
                onValueChange={(value) => {
                  const month = Number(value);
                  setStartMonth(month);
                  if (month > endMonth) setEndMonth(month);
                  handleRangeChange();
                }}
              >
                {months.map((month, index) => (
                  <DropdownMenuRadioItem
                    key={month}
                    value={index.toString()}
                  >
                    {month}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* End Month Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-[140px]">
                To: {months[endMonth]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              <DropdownMenuLabel>End Month</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={endMonth.toString()}
                onValueChange={(value) => {
                  const month = Number(value);
                  setEndMonth(month);
                  if (month < startMonth) setStartMonth(month);
                  handleRangeChange();
                }}
              >
                {months.map((month, index) => (
                  <DropdownMenuRadioItem
                    key={month}
                    value={index.toString()}
                    disabled={index < startMonth}
                  >
                    {month}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

function EmptyData() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="text-muted-foreground text-lg font-medium">
        No data available
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col items-center justify-center p-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center p-4 pt-0">
        <span className="text-3xl font-bold text-primary">{value}</span>
      </CardContent>
    </Card>
  );
}

function StatisticsBarChart({ 
  projectsData, 
  clientsData,
  timeRange,
  customRange
}: { 
  projectsData: any[];
  clientsData: any[];
  timeRange: string;
  customRange?: { year: number; startMonth: number; endMonth: number };
}) {
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
          trainings: 0 // Replace with actual training data if available
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

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-col items-center justify-center p-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Statistics Visualization ({timeRange})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
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
              />
              <Legend />
              <Bar dataKey="projects" fill="#0088FE" name="Projects" />
              <Bar dataKey="clients" fill="#00C49F" name="Clients" />
              <Bar dataKey="trainings" fill="#FFBB28" name="Trainings" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function ServiceRequestedChart({ projects }: { projects: any[] }) {
  type ServiceCategory = "Laboratory Services" | "Equipment Use" | "Bioinformatics Analysis";
  
  const serviceCounts: Record<ServiceCategory, number> = {
    "Laboratory Services": 0,
    "Equipment Use": 0,
    "Bioinformatics Analysis": 0
  };

  projects.forEach(project => {
    project.serviceRequested.forEach((service: string) => {
      if (service in serviceCounts) {
        serviceCounts[service as ServiceCategory] += 1;
      }
    });
  });

  const data = Object.entries(serviceCounts)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({
      name,
      value
    }));

  if (data.length === 0) {
    return (
      <Card className="flex-1 min-w-0">
        <CardHeader className="flex flex-col items-center justify-center p-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">Service Requested</CardTitle>
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

function SendingInstitutionChart({ projects }: { projects: any[] }) {
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

function FundingCategoryChart({ projects }: { projects: any[] }) {
  const fundingCategoryMap: Record<string, string> = {
    "In-House": "In-House",
    "External": "External" 
  };
  
  type InstitutionCategory = keyof typeof fundingCategoryMap;
  
  const fundingCounts: Record<InstitutionCategory, number> = {
    "In-House": 0,
    "External": 0,
  };

  projects.forEach(project => {
    const fundingCategory = project.fundingCategory;
    const mappedCategory = Object.entries(fundingCategoryMap).find(
      ([key]) => key === fundingCategory
    )?.[1] as InstitutionCategory | undefined;

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

export default function Dashboard() {
  const [filteredProjects, setFilteredProjects] = React.useState(projects);
  const [filteredClients, setFilteredClients] = React.useState(clients);
  const [timeRange, setTimeRange] = React.useState("all");
  const [customRange, setCustomRange] = React.useState<{year: number, startMonth: number, endMonth: number}>();

  const handleTimeFilterChange = (range: string | { year: number; startMonth: number; endMonth: number }) => {
    if (typeof range === "string") {
      setTimeRange(range);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const filterByDate = (dateString: string) => {
        const itemDate = new Date(dateString);
        
        switch(range) {
          case "today":
            return itemDate >= today;
          case "weekly":
            const weekAgo = new Date(today);
            weekAgo.setDate(today.getDate() - 7);
            return itemDate >= weekAgo;
          case "monthly":
            const monthAgo = new Date(today);
            monthAgo.setMonth(today.getMonth() - 1);
            return itemDate >= monthAgo;
          case "yearly":
            const yearAgo = new Date(today);
            yearAgo.setFullYear(today.getFullYear() - 1);
            return itemDate >= yearAgo;
          default:
            return true;
        }
      };

      const filteredProjects = projects.filter(project => 
        filterByDate(project.startDate.value)
      );

      const filteredClients = clients.filter(client => 
        filterByDate(client.dateReceived.value)
      );

      setFilteredProjects(filteredProjects);
      setFilteredClients(filteredClients);
    } else {
      setTimeRange("custom");
      setCustomRange(range);
      const { year, startMonth, endMonth } = range;
      
      const filterByYearMonth = (dateString: string) => {
        const itemDate = new Date(dateString);
        const itemYear = itemDate.getFullYear();
        const itemMonth = itemDate.getMonth();
        
        return (
          itemYear === year && 
          itemMonth >= startMonth && 
          itemMonth <= endMonth
        );
      };

      const filteredProjects = projects.filter(project => 
        filterByYearMonth(project.startDate.value)
      );

      const filteredClients = clients.filter(client => 
        filterByYearMonth(client.dateReceived.value)
      );

      setFilteredProjects(filteredProjects);
      setFilteredClients(filteredClients);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Welcome, Admin!</h1>
        <TimeFilter onFilterChange={handleTimeFilterChange} />
      </div>

      {/* Top Section - StatCards and Bar Graph */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 h-[350px]">
        {/* Vertical StatCards - Left Side */}
        <div className="flex flex-col gap-4 w-full md:w-1/4">
          <StatCard title="Total Clients" value={filteredClients.length} />
          <StatCard title="Total Projects" value={filteredProjects.length} />
          <StatCard title="Total Trainings" value={8} />
        </div>

        {/* Bar Graph - Right Side */}
        <div className="w-full md:w-3/4 h-full">
          <StatisticsBarChart 
            projectsData={projects}
            clientsData={clients}
            timeRange={timeRange}
            customRange={customRange}
          />
        </div>
      </div>

      {/* Bottom Section - Pie Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ServiceRequestedChart projects={filteredProjects} />
        <SendingInstitutionChart projects={filteredProjects} />
        <FundingCategoryChart projects={filteredProjects} />
      </div>
    </div>
  );
}