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
    const updateSurveyCollaboratorRole = vi.fn(async () => ({ ...fakeSurveyCollaborator, role: "manager" as const }));
    const revokeSurveyCollaborator = vi.fn(async () => ({ ...fakeSurveyCollaborator, revokedAt: "2026-05-28T03:00:00.000Z" }));

    renderSettings({
      listSurveyCollaborators: async () => [fakeSurveyCollaborator],
      inviteSurveyCollaborator,
      updateSurveyCollaboratorRole,
      revokeSurveyCollaborator,
    });

    await user.type(await screen.findByLabelText("공유할 이메일"), "editor@example.com");
    await user.selectOptions(screen.getByLabelText("공유 역할"), "manager");
    await user.click(screen.getByRole("button", { name: "등록" }));

    expect(inviteSurveyCollaborator).toHaveBeenCalledWith({
      surveyId: "survey-1",
      email: "editor@example.com",
      role: "manager",
    });

    await user.selectOptions(screen.getByLabelText("viewer@example.com 역할"), "manager");
    expect(updateSurveyCollaboratorRole).toHaveBeenCalledWith({
      collaboratorId: "survey-collaborator-1",
      surveyId: "survey-1",
      role: "manager",
    });

    await user.click(screen.getByRole("button", { name: "해제" }));
    expect(revokeSurveyCollaborator).toHaveBeenCalledWith({
      collaboratorId: "survey-collaborator-1",
      surveyId: "survey-1",
    });
  });

  it("lets invitation managers manage survey collaborators and settings", async () => {
    const user = userEvent.setup();
    const inviteSurveyCollaborator = vi.fn(async () => ({ ...fakeSurveyCollaborator, role: "editor" as const }));

    renderSettings({
      getSurveyDetail: async () => ({
        survey: { ...fakeSurvey, accessRole: "manager" },
        sections: [],
        questions: [],
        assets: [],
      }),
      listSurveyCollaborators: async () => [],
      inviteSurveyCollaborator,
    });

    await user.type(await screen.findByLabelText("공유할 이메일"), "editor@example.com");
    await user.selectOptions(screen.getByLabelText("공유 역할"), "editor");
    await user.click(screen.getByRole("button", { name: "등록" }));

    expect(inviteSurveyCollaborator).toHaveBeenCalledWith({
      surveyId: "survey-1",
      email: "editor@example.com",
      role: "editor",
    });
    expect(screen.getByText("아직 공유된 사용자가 없습니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "게시" })).toBeInTheDocument();
    expect(screen.getByLabelText("Public slug")).toBeInTheDocument();
  });

  it("blocks shared viewers from invitation settings", async () => {
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

  it("opens participant links on the production survey domain using public code when slug is empty", async () => {
    renderSettings();

    const openLink = await screen.findByRole("link", { name: "열기" });
    expect(screen.getByText("https://taglow.newdawn.co.kr/survey/8K2PQA")).toBeInTheDocument();
    expect(openLink).toHaveAttribute("href", "https://taglow.newdawn.co.kr/survey/8K2PQA");
  });

  it("prefers public slug over public code for participant links", async () => {
    renderSettings({
      getSurveyDetail: async () => ({
        survey: { ...fakeSurvey, publicSlug: "handong-dorm-2026", publicCode: "8K2PQA" },
        sections: [],
        questions: [],
        assets: [],
      }),
    });

    const openLink = await screen.findByRole("link", { name: "열기" });
    expect(screen.getByText("https://taglow.newdawn.co.kr/survey/handong-dorm-2026")).toBeInTheDocument();
    expect(openLink).toHaveAttribute("href", "https://taglow.newdawn.co.kr/survey/handong-dorm-2026");
  });

  it("saves scheduled publish and close times through the admin update mutation", async () => {
    const user = userEvent.setup();
    const updateSurvey = vi.fn(async () => fakeSurvey);
    renderSettings({ updateSurvey });

    const startsAtInput = await screen.findByLabelText("설문 게시 시간");
    const endsAtInput = screen.getByLabelText("설문 종료 시간");

    await user.type(startsAtInput, "2026-06-05T09:30");
    await user.type(endsAtInput, "2026-06-12T18:00");
    await user.click(screen.getByRole("button", { name: "예약 저장" }));

    expect(updateSurvey).toHaveBeenCalledWith({
      surveyId: "survey-1",
      startsAt: new Date("2026-06-05T09:30").toISOString(),
      endsAt: new Date("2026-06-12T18:00").toISOString(),
    });
  });
});
