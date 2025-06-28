export interface MonthlyBreakdown {
  month: string;
  quotations: number;
  charges: number;
}

export interface Stats {
  totalClients: number;
  totalProjects: number;
  totalQuotations: number;
  totalChargeSlips: number;
  monthlyBreakdown: MonthlyBreakdown[];
}