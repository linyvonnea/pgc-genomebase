"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardTitle,
} from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: number | string;
  colorIndex?: number; // Optional color index
}

// Colors for each category
const COLORS = [
  "#F06292", 
  "#81C784", 
  "#64B5F6", 
  "#BA68C8", 
];

export function StatCard({ title, value, colorIndex = 0 }: StatCardProps) {
  // Use modulo to cycle through colors safely
  const color = COLORS[colorIndex % COLORS.length];
  
  return (
    <Card className="rounded-lg border h-full">
      <CardContent className="p-4 flex flex-col justify-center items-center h-full">
        <div 
          className="text-2xl font-bold"
          style={{ color }}
        >
          {value}
        </div>
        <CardTitle className="text-sm text-muted-foreground font-normal pt-1 text-center">
          {title}
        </CardTitle>
      </CardContent>
    </Card>
  );
}