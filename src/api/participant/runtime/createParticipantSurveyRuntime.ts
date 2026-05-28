import { createClient } from "@supabase/supabase-js";
import type { EnvConfig } from "../../../utils/envConfig";
import { GatewayBackedParticipantSurveyController } from "../controller";
import type { ParticipantSurveyController } from "../controller";
import { SupabaseParticipantSurveyGateway } from "../service/gateway";
import { ParticipantSurveyMapper } from "../service/mapper";

export function createParticipantSurveyRuntime(env: EnvConfig): ParticipantSurveyController {
  if (env.apiMode === "http") {
    throw new Error("Participant HTTP API runtime is not configured yet.");
  }

  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required.");
  }

  const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey);
  return new GatewayBackedParticipantSurveyController(
    new SupabaseParticipantSurveyGateway(supabase),
    new ParticipantSurveyMapper(),
  );
}
