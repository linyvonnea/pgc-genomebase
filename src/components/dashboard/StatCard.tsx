"use client";

import * as React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: number | string;
}

export function StatCard({ title, value }: StatCardProps) {
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