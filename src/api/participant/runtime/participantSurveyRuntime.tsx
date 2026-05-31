import { useMemo, type ReactNode } from "react";
import type { SupabaseBrowserClient } from "../../supabaseClient";
import { readEnvConfig, type EnvConfig } from "../../../utils/envConfig";
import { ParticipantSurveyControllerProvider } from "../controller";
import { createParticipantSurveyRuntime } from "./createParticipantSurveyRuntime";

export function ParticipantSurveyRuntimeProvider(props: {
  children: ReactNode;
  env?: EnvConfig;
  supabaseClient?: SupabaseBrowserClient;
}) {
  const controller = useMemo(
    () => createParticipantSurveyRuntime(props.env ?? readEnvConfig(), props.supabaseClient),
    [props.env, props.supabaseClient],
  );

  return (
    <ParticipantSurveyControllerProvider controller={controller}>
      {props.children}
    </ParticipantSurveyControllerProvider>
  );
}
