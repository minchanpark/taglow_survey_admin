import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { AdminApiRuntimeProvider } from "../api/admin/runtime";
import { ParticipantSurveyRuntimeProvider } from "../api/participant/runtime";
import { createAppQueryClient } from "./queryClient";

export function AppProviders(props: { children: ReactNode }) {
  const [queryClient] = useState(() => createAppQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AdminApiRuntimeProvider>
        <ParticipantSurveyRuntimeProvider>{props.children}</ParticipantSurveyRuntimeProvider>
      </AdminApiRuntimeProvider>
    </QueryClientProvider>
  );
}
