import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";
import type { AdminApiController } from "../api/admin/controller";
import { AdminApiControllerProvider } from "../api/admin/controller";
import { createFakeAdminApiController } from "./fakeAdminApiController";

type RenderWithProvidersOptions = RenderOptions & {
  controller?: AdminApiController;
};

export function renderWithProviders(ui: ReactElement, options: RenderWithProvidersOptions = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const controller = options.controller ?? createFakeAdminApiController();

  return render(
    <QueryClientProvider client={queryClient}>
      <AdminApiControllerProvider controller={controller}>{ui}</AdminApiControllerProvider>
    </QueryClientProvider>,
    options,
  );
}
