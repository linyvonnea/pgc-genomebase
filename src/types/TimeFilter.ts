//src/components/dashboard/TimeFilter.types.ts
export type CustomRange = { year: number; startMonth: number; endMonth: number; };
export type TimeRange = "all" | "today" | "weekly" | "monthly" | "yearly" | "custom";
export interface TimeFilterProps {
  onFilterChange: (range: TimeRange | CustomRange) => void | Promise<void>;
}