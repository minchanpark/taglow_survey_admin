import { createClient } from "@supabase/supabase-js";
import type { EnvConfig } from "../../../utils/envConfig";
import type { AdminApiController } from "../controller/adminApiController";
import { GatewayBackedAdminApiController } from "../controller/gatewayBackedAdminApiController";
import { HttpAdminApiGateway } from "../service/gateway/httpAdminApiGateway";
import { SupabaseAdminApiGateway } from "../service/gateway/supabaseAdminApiGateway";
import { SupabaseAdminStorageGateway } from "../service/gateway/supabaseAdminStorageGateway";
import { AdminPayloadMapper } from "../service/mapper/adminPayloadMapper";

export function createAdminApiRuntime(env: EnvConfig): AdminApiController {
  if (env.apiMode === "http") {
    if (!env.apiBaseUrl) {
      throw new Error("VITE_ADMIN_API_BASE_URL is required when VITE_ADMIN_API_MODE=http.");
    }

    const gateway = new HttpAdminApiGateway({ baseUrl: env.apiBaseUrl });
    return new GatewayBackedAdminApiController(gateway, createUnsupportedHttpStorageGateway(), new AdminPayloadMapper());
  }

  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required.");
  }

  const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey);
  const gateway = new SupabaseAdminApiGateway(supabase, env.storageBucket);
  const storageGateway = new SupabaseAdminStorageGateway({
    supabase,
    bucket: env.storageBucket,
  });

  return new GatewayBackedAdminApiController(gateway, storageGateway, new AdminPayloadMapper());
}

function createUnsupportedHttpStorageGateway() {
  return {
    async uploadSurveyAsset(): Promise<never> {
      throw new Error("HTTP storage upload is not configured yet.");
    },
  };
}
