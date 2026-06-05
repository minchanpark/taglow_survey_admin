import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { AdminApiController } from "../../../api/admin/controller";
import type { CreateSurveyCommand } from "../../../api/admin/model";
import { activeAdminSession, createFakeAdminApiController, fakeSurvey, sharedSurveySession } from "../../../test/fakeAdminApiController";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { NewSurveyPage } from "./NewSurveyPage";

function renderNewSurveyPage(overrides: Partial<AdminApiController> = {}) {
  const createSurvey = overrides.createSurvey ?? vi.fn<AdminApiController["createSurvey"]>(async () => fakeSurvey);
  renderWithProviders(
    <MemoryRouter initialEntries={["/admin/surveys/new"]}>
      <Routes>
        <Route path="/admin/surveys/new" element={<NewSurveyPage />} />
        <Route path="/admin/surveys/:surveyId/builder" element={<div>builder route</div>} />
        <Route path="/admin/profile" element={<div>profile route</div>} />
      </Routes>
    </MemoryRouter>,
    {
      controller: createFakeAdminApiController({
        getAdminSessionState: async () => activeAdminSession,
        createSurvey,
        ...overrides,
      }),
    },
  );
  return { createSurvey };
}

describe("NewSurveyPage", () => {
  it("requires a survey title before creating", async () => {
    const user = userEvent.setup();
    const { createSurvey } = renderNewSurveyPage();

    await user.click(await screen.findByRole("button", { name: "설문 생성" }));

    expect(await screen.findByText("설문 제목을 입력해주세요.")).toBeInTheDocument();
    expect(createSurvey).not.toHaveBeenCalled();
  });

  it("creates a draft survey and navigates to the builder", async () => {
    const user = userEvent.setup();
    const createSurvey = vi.fn<AdminApiController["createSurvey"]>(async (command: CreateSurveyCommand) => ({
      ...fakeSurvey,
      id: "created-survey",
      title: command.title,
      description: command.description,
      settings: command.settings ?? {},
    }));
    renderNewSurveyPage({ createSurvey });

    await user.type(await screen.findByLabelText("설문 제목"), "2026 생활관 만족도 조사");
    await user.type(screen.getByLabelText("영어 제목"), "2026 Dormitory Satisfaction Survey");
    await user.type(screen.getByLabelText("설명"), "봄학기 생활관 경험을 확인합니다.");
    await user.click(screen.getByRole("button", { name: "설문 생성" }));

    expect(await screen.findByText("builder route")).toBeInTheDocument();
    expect(createSurvey).toHaveBeenCalledWith({
      title: "2026 생활관 만족도 조사",
      titleEn: "2026 Dormitory Satisfaction Survey",
      description: { ko: "봄학기 생활관 경험을 확인합니다." },
      settings: {
        locales: ["ko", "en"],
        defaultLocale: "ko",
        collectBasicProfile: true,
        participantAccess: "google",
      },
    });
  });

  it("blocks shared-only users from creating surveys and points them to profile access request", async () => {
    const user = userEvent.setup();
    const createSurvey = vi.fn<AdminApiController["createSurvey"]>(async () => fakeSurvey);
    renderNewSurveyPage({
      getAdminSessionState: async () => sharedSurveySession,
      createSurvey,
    });

    expect(await screen.findByText("설문을 만들 수 없습니다.")).toBeInTheDocument();
    expect(screen.getByText("공유받은 설문은 접근 권한에 따라 볼 수 있지만, 새 설문을 만들려면 관리자 승인이 필요합니다.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "관리자 권한 요청" }));

    expect(await screen.findByText("profile route")).toBeInTheDocument();
    expect(createSurvey).not.toHaveBeenCalled();
  });
});
