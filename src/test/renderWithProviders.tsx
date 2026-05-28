import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";
import type { AdminApiController } from "../api/admin/controller";
import { AdminApiControllerProvider } from "../api/admin/controller";
import type { ParticipantSurveyController } from "../api/participant";
import { ParticipantSurveyControllerProvider } from "../api/participant";
import { createFakeAdminApiController } from "./fakeAdminApiController";
import { createFakeParticipantSurveyController } from "./fakeParticipantSurveyController";

type RenderWithProvidersOptions = RenderOptions & {
  controller?: AdminApiController;
  participantController?: ParticipantSurveyController;
};

export function renderWithProviders(ui: ReactElement, options: RenderWithProvidersOptions = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const controller = options.controller ?? createFakeAdminApiController();
  const participantController = options.participantController ?? createFakeParticipantSurveyController();

  return render(
    <QueryClientProvider client={queryClient}>
      <AdminApiControllerProvider controller={controller}>
        <ParticipantSurveyControllerProvider controller={participantController}>
          {ui}
        </ParticipantSurveyControllerProvider>
      </AdminApiControllerProvider>
    </QueryClientProvider>,
    options,
  );
}
