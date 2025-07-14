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

const COLORS = [
  "#F69122", // Orange
  "#B9273A", // Red
  "#912ABD", // Purple
  "#6E30BE", // Violet
  "#633190", // Deep Purple
  "#40388F", // Indigo
  "#166FB5"  // Blue
];

export function StatCard({ title, value, colorIndex = 0 }: StatCardProps) {
  // Use modulo to cycle through colors safely
  const color = COLORS[colorIndex % COLORS.length];
  
  return (
    <Card className="rounded-lg border">
      <CardContent className="p-4">
        <div 
          className="text-2xl font-bold" 
          style={{ color }}
        >
          {value}
        </div>
        <CardTitle className="text-sm text-muted-foreground font-normal pt-1">
          {title}
        </CardTitle>
      </CardContent>
    </Card>
  );
}