import { createClient } from "@supabase/supabase-js";
import type { EnvConfig } from "../utils/envConfig";

export type SupabaseBrowserClient = ReturnType<typeof createClient>;

export function createSupabaseBrowserClient(env: EnvConfig): SupabaseBrowserClient | undefined {
  if (env.apiMode === "http") return undefined;

  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required.");
  }

  return createClient(env.supabaseUrl, env.supabaseAnonKey);
}
