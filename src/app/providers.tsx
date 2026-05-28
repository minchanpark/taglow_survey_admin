import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { AdminApiRuntimeProvider } from "../api/admin/runtime";
import { createAppQueryClient } from "./queryClient";

export function AppProviders(props: { children: ReactNode }) {
  const [queryClient] = useState(() => createAppQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AdminApiRuntimeProvider>{props.children}</AdminApiRuntimeProvider>
    </QueryClientProvider>
  );
}
