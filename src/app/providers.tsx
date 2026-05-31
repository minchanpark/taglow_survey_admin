import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { AdminApiRuntimeProvider } from "../api/admin/runtime";
import { ParticipantSurveyRuntimeProvider } from "../api/participant/runtime";
import { createSupabaseBrowserClient } from "../api/supabaseClient";
import { readEnvConfig } from "../utils/envConfig";
import { createAppQueryClient } from "./queryClient";

export function AppProviders(props: { children: ReactNode }) {
  const [env] = useState(() => readEnvConfig());
  const [supabaseClient] = useState(() => createSupabaseBrowserClient(env));
  const [queryClient] = useState(() => createAppQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AdminApiRuntimeProvider env={env} supabaseClient={supabaseClient}>
        <ParticipantSurveyRuntimeProvider env={env} supabaseClient={supabaseClient}>
          {props.children}
        </ParticipantSurveyRuntimeProvider>
      </AdminApiRuntimeProvider>
    </QueryClientProvider>
  );
}
