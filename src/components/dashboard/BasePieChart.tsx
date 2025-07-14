"use client";

import * as React from "react";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface BasePieChartProps<T extends string> {
  title: string;
  categories: readonly T[];
  colors: Record<T, string>;
  data: { name: T; value: number }[];
  emptyMessage: string;
  legendWrapperStyle?: React.CSSProperties;
}

export function BasePieChart<T extends string>({
  title,
  categories,
  colors,
  data,
  emptyMessage,
  legendWrapperStyle = { justifyContent: 'center' },
}: BasePieChartProps<T>) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="flex-1 min-w-0">
      <CardHeader className="flex flex-col items-center justify-center p-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="h-[300px]">
          {total === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ value }) => `${value}`}
                  stroke="none"
                  outerRadius={80}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={colors[entry.name]}
                      opacity={entry.value > 0 ? 1 : 0}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: "6px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    fontSize: "14px",
                    fontWeight: 500,
                    padding: "8px 12px",
                  }}
                  formatter={(value: number, name: T) => [
                    <span key="combined" className="flex items-center gap-2">
                      <span className="text-gray-600">{name}</span>
                      <span
                        className="font-semibold"
                        style={{ color: colors[name] }}
                      >
                        {value}
                      </span>
                    </span>,
                    null,
                  ]}
                />
                <Legend
                  iconSize={12}
                  wrapperStyle={legendWrapperStyle}
                  content={() => (
                    <div className="flex flex-wrap justify-center gap-2">
                      {categories.map((category) => (
                        <div key={category} className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-[2px]"
                            style={{ background: colors[category] }}
                          />
                          <span className="text-xs">{category}</span>
                        </div>
                      ))}
                    </div>
                  )}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}