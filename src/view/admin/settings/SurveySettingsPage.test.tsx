import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { AdminApiController } from "../../../api/admin/controller";
import { createFakeAdminApiController, fakeSurvey, fakeSurveyCollaborator } from "../../../test/fakeAdminApiController";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { SurveySettingsPage } from "./SurveySettingsPage";

function renderSettings(overrides: Partial<AdminApiController> = {}) {
  return renderWithProviders(
    <MemoryRouter initialEntries={["/admin/surveys/survey-1/settings"]}>
      <Routes>
        <Route path="/admin/surveys/:surveyId/settings" element={<SurveySettingsPage />} />
      </Routes>
    </MemoryRouter>,
    {
      controller: createFakeAdminApiController(overrides),
    },
  );
}

describe("SurveySettingsPage", () => {
  it("lets owners add, update, and revoke survey collaborators", async () => {
    const user = userEvent.setup();
    const inviteSurveyCollaborator = vi.fn(async () => fakeSurveyCollaborator);
    const updateSurveyCollaboratorRole = vi.fn(async () => ({ ...fakeSurveyCollaborator, role: "editor" as const }));
    const revokeSurveyCollaborator = vi.fn(async () => ({ ...fakeSurveyCollaborator, revokedAt: "2026-05-28T03:00:00.000Z" }));

    renderSettings({
      listSurveyCollaborators: async () => [fakeSurveyCollaborator],
      inviteSurveyCollaborator,
      updateSurveyCollaboratorRole,
      revokeSurveyCollaborator,
    });

    await user.type(await screen.findByLabelText("공유할 이메일"), "editor@example.com");
    await user.selectOptions(screen.getByLabelText("공유 역할"), "editor");
    await user.click(screen.getByRole("button", { name: "등록" }));

    expect(inviteSurveyCollaborator).toHaveBeenCalledWith({
      surveyId: "survey-1",
      email: "editor@example.com",
      role: "editor",
    });

    await user.selectOptions(screen.getByLabelText("viewer@example.com 역할"), "editor");
    expect(updateSurveyCollaboratorRole).toHaveBeenCalledWith({
      collaboratorId: "survey-collaborator-1",
      surveyId: "survey-1",
      role: "editor",
    });

    await user.click(screen.getByRole("button", { name: "해제" }));
    expect(revokeSurveyCollaborator).toHaveBeenCalledWith({
      collaboratorId: "survey-collaborator-1",
      surveyId: "survey-1",
    });
  });

  it("blocks shared viewers from owner-only settings", async () => {
    renderSettings({
      getSurveyDetail: async () => ({
        survey: { ...fakeSurvey, accessRole: "viewer" },
        sections: [],
        questions: [],
        assets: [],
      }),
    });

    expect(await screen.findByText("설문 설정을 변경할 수 없습니다.")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "게시" })).not.toBeInTheDocument();
    });
  });
});
