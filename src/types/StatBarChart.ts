// Props interface for the bar chart
export interface StatisticsBarChartProps {
  projectsData: any[];
  clientsData: any[];
  trainingsData: any[];
  timeRange: string;
  customRange?: { year: number; startMonth: number; endMonth: number };
}