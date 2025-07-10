"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TimeFilterProps {
  onFilterChange: (value: string | { year: number; startMonth: number; endMonth: number }) => void;
}

type TimeRange = "all" | "today" | "weekly" | "monthly" | "yearly" | "custom";

export function TimeFilter({ onFilterChange }: TimeFilterProps) {
  const [timeRange, setTimeRange] = React.useState<TimeRange>("all");
  const [year, setYear] = React.useState(new Date().getFullYear());
  const [startMonth, setStartMonth] = React.useState(0);
  const [endMonth, setEndMonth] = React.useState(11);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const timeRangeLabels: Record<TimeRange, string> = {
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
    <div className="w-full flex justify-end">
      <div className="flex flex-col sm:flex-row items-end gap-2 w-full">
        {timeRange !== "custom" ? (
          <div className="w-[160px]">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full text-left truncate"
                >
                  Timeline: {timeRangeLabels[timeRange]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                className="w-[var(--radix-dropdown-menu-trigger-width)]" 
                align="end"
              >
                <DropdownMenuRadioGroup 
                  value={timeRange} 
                  onValueChange={(value: string) => {
                    const range = value as TimeRange;
                    setTimeRange(range);
                    if (range !== "custom") {
                      onFilterChange(value);
                    }
                  }}
                >
                  {Object.entries(timeRangeLabels).map(([value, label]) => (
                    <DropdownMenuRadioItem 
                      key={value}
                      value={value}
                    >
                      {label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="flex flex-wrap justify-end gap-2 w-full">
            {/* Timeline Dropdown */}
            <div className="w-[160px]">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full text-left truncate"
                  >
                    Timeline: Custom
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  className="w-[var(--radix-dropdown-menu-trigger-width)]" 
                  align="end"
                >
                  <DropdownMenuRadioGroup 
                    value={timeRange} 
                    onValueChange={(value: string) => {
                      const range = value as TimeRange;
                      setTimeRange(range);
                      if (range !== "custom") {
                        onFilterChange(value);
                      }
                    }}
                  >
                    {Object.entries(timeRangeLabels).map(([value, label]) => (
                      <DropdownMenuRadioItem
                        key={value}
                        value={value}
                      >
                        {label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Year Picker */}
            <div className="w-[160px]">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full text-left truncate"
                  >
                    Year: {year}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  className="w-[var(--radix-dropdown-menu-trigger-width)]" 
                  align="end"
                >
                  <DropdownMenuRadioGroup
                    value={year.toString()}
                    onValueChange={(value: string) => {
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
            </div>

            {/* Start Month Picker */}
            <div className="w-[160px]">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full text-left truncate"
                  >
                    From: {months[startMonth]}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  className="w-[var(--radix-dropdown-menu-trigger-width)]" 
                  align="end"
                >
                  <DropdownMenuRadioGroup
                    value={startMonth.toString()}
                    onValueChange={(value: string) => {
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
            </div>

            {/* End Month Picker */}
            <div className="w-[160px]">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full text-left truncate"
                  >
                    To: {months[endMonth]}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  className="w-[var(--radix-dropdown-menu-trigger-width)]" 
                  align="end"
                >
                  <DropdownMenuRadioGroup
                    value={endMonth.toString()}
                    onValueChange={(value: string) => {
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
          </div>
        )}
      </div>
    </div>
  );
}