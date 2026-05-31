import { useMemo, type ReactNode } from "react";
import type { SupabaseBrowserClient } from "../../supabaseClient";
import { readEnvConfig, type EnvConfig } from "../../../utils/envConfig";
import { AdminApiControllerProvider } from "../controller/adminApiControllerProvider";
import { createAdminApiRuntime } from "./createAdminApiRuntime";

export function AdminApiRuntimeProvider(props: {
  children: ReactNode;
  env?: EnvConfig;
  supabaseClient?: SupabaseBrowserClient;
}) {
  const controller = useMemo(
    () => createAdminApiRuntime(props.env ?? readEnvConfig(), props.supabaseClient),
    [props.env, props.supabaseClient],
  );

  return (
    <AdminApiControllerProvider controller={controller}>
      {props.children}
    </AdminApiControllerProvider>
  );
}
