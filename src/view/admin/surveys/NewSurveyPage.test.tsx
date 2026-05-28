import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { AdminApiController } from "../../../api/admin/controller";
import type { CreateSurveyCommand } from "../../../api/admin/model";
import { createFakeAdminApiController, fakeSurvey } from "../../../test/fakeAdminApiController";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { NewSurveyPage } from "./NewSurveyPage";

function renderNewSurveyPage(createSurvey: AdminApiController["createSurvey"] = vi.fn(async () => fakeSurvey)) {
  renderWithProviders(
    <MemoryRouter initialEntries={["/admin/surveys/new"]}>
      <Routes>
        <Route path="/admin/surveys/new" element={<NewSurveyPage />} />
        <Route path="/admin/surveys/:surveyId/builder" element={<div>builder route</div>} />
      </Routes>
    </MemoryRouter>,
    {
      controller: createFakeAdminApiController({
        createSurvey,
      }),
    },
  );
  return { createSurvey };
}

describe("NewSurveyPage", () => {
  it("requires a survey title before creating", async () => {
    const user = userEvent.setup();
    const { createSurvey } = renderNewSurveyPage();

    await user.click(screen.getByRole("button", { name: "설문 생성" }));

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
    renderNewSurveyPage(createSurvey);

    await user.type(screen.getByLabelText("설문 제목"), "2026 생활관 만족도 조사");
    await user.type(screen.getByLabelText("설명"), "봄학기 생활관 경험을 확인합니다.");
    await user.click(screen.getByRole("button", { name: "설문 생성" }));

    expect(await screen.findByText("builder route")).toBeInTheDocument();
    expect(createSurvey).toHaveBeenCalledWith({
      title: "2026 생활관 만족도 조사",
      description: "봄학기 생활관 경험을 확인합니다.",
      settings: {
        locales: ["ko", "en"],
        defaultLocale: "ko",
        collectBasicProfile: true,
        participantAccess: "google",
      },
    });
  });
});
