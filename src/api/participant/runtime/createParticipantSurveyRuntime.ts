import type { EnvConfig } from "../../../utils/envConfig";
import { createSupabaseBrowserClient, type SupabaseBrowserClient } from "../../supabaseClient";
import { GatewayBackedParticipantSurveyController } from "../controller";
import type { ParticipantSurveyController } from "../controller";
import { SupabaseParticipantSurveyGateway } from "../service/gateway";
import { ParticipantSurveyMapper } from "../service/mapper";

export function createParticipantSurveyRuntime(env: EnvConfig, supabaseClient?: SupabaseBrowserClient): ParticipantSurveyController {
  if (env.apiMode === "http") {
    throw new Error("Participant HTTP API runtime is not configured yet.");
  }

  const supabase = supabaseClient ?? createSupabaseBrowserClient(env);
  if (!supabase) {
    throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required.");
  }

  return new GatewayBackedParticipantSurveyController(
    new SupabaseParticipantSurveyGateway(supabase, env.storageBucket),
    new ParticipantSurveyMapper(),
  );
}
