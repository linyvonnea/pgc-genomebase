"use client";

import * as React from "react";

export function EmptyData() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="text-muted-foreground text-lg font-medium">
        No data available
      </div>
    </div>
  );
}