import { useMemo, type ReactNode } from "react";
import { readEnvConfig, type EnvConfig } from "../../../utils/envConfig";
import { ParticipantSurveyControllerProvider } from "../controller";
import { createParticipantSurveyRuntime } from "./createParticipantSurveyRuntime";

export function ParticipantSurveyRuntimeProvider(props: {
  children: ReactNode;
  env?: EnvConfig;
}) {
  const controller = useMemo(
    () => createParticipantSurveyRuntime(props.env ?? readEnvConfig()),
    [props.env],
  );

  return (
    <ParticipantSurveyControllerProvider controller={controller}>
      {props.children}
    </ParticipantSurveyControllerProvider>
  );
}
