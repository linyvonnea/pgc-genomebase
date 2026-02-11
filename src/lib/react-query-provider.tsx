// src/lib/react-query-provider.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Keep data in cache for 10 minutes of inactivity
        gcTime: 1000 * 60 * 10,
        // Data stays fresh for 5 minutes - won't refetch during this time
        staleTime: 1000 * 60 * 5,
        // Refetch when window regains focus
        refetchOnWindowFocus: true,
        // Don't refetch on mount if data is still fresh
        refetchOnMount: false,
        // Retry failed requests once
        retry: 1,
      },
    },
  }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}