import { screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { AdminApiController } from "../../../api/admin/controller";
import type { IdentityResponse, Survey } from "../../../api/admin/model";
import { createFakeAdminApiController, fakeSurvey } from "../../../test/fakeAdminApiController";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { SurveyDashboardPage } from "./SurveyDashboardPage";

const identityResponses: IdentityResponse[] = [
  {
    responseId: "response-1",
    studentNumber: "22000123",
    name: "김태글",
    profile: { dormitory: "비전관", roomType: "2인실", rc: "장기려" },
    submittedAt: "2026-05-28T00:00:00.000Z",
  },
];

function renderDashboard(survey: Survey = fakeSurvey, overrides: Partial<AdminApiController> = {}) {
  return renderWithProviders(
    <MemoryRouter initialEntries={["/admin/surveys/survey-1/dashboard"]}>
      <Routes>
        <Route path="/admin/surveys/:surveyId/dashboard" element={<SurveyDashboardPage />} />
      </Routes>
    </MemoryRouter>,
    {
      controller: createFakeAdminApiController({
        getSurveyDetail: async () => ({
          survey,
          sections: [],
          questions: [],
          assets: [],
        }),
        ...overrides,
      }),
    },
  );
}

describe("SurveyDashboardPage", () => {
  it("links an existing survey to builder editing and preview", async () => {
    renderDashboard();

    expect(await screen.findByRole("heading", { name: "생활관 만족도 조사" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "빌더에서 수정" })).toHaveAttribute(
      "href",
      "/admin/surveys/survey-1/builder",
    );
    expect(screen.getByRole("link", { name: "미리보기" })).toHaveAttribute("href", "/admin/surveys/survey-1/preview");
  });

  it("shows the detailed response roster on the dashboard", async () => {
    renderDashboard(fakeSurvey, {
      listIdentityResponses: async () => ({ items: identityResponses }),
    });

    const rosterHeading = await screen.findByRole("heading", { name: "상세 명단" });
    expect(rosterHeading).toBeInTheDocument();
    expect(await screen.findByText("22000123")).toBeInTheDocument();
    expect(screen.getByText("김태글")).toBeInTheDocument();
    expect(screen.getByText("비전관 · 2인실 · 장기려")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "먼저 볼 항목" })).not.toBeInTheDocument();
  });

  it("hides builder and settings actions for shared viewer surveys", async () => {
    renderDashboard({ ...fakeSurvey, accessRole: "viewer" });

    expect(await screen.findByRole("heading", { name: "생활관 만족도 조사" })).toBeInTheDocument();
    expect(screen.getByText("결과보기")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "빌더에서 수정" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "설정" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "분석 보기" })).toHaveAttribute("href", "/admin/surveys/survey-1/analysis");
  });

  it("shows builder but hides settings for shared editor surveys", async () => {
    renderDashboard({ ...fakeSurvey, accessRole: "editor" });

    expect(await screen.findByText("작업 가능")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "빌더에서 수정" })).toHaveAttribute(
      "href",
      "/admin/surveys/survey-1/builder",
    );
    expect(screen.queryByRole("link", { name: "설정" })).not.toBeInTheDocument();
  });

  it("shows builder and settings for shared invitation manager surveys", async () => {
    renderDashboard({ ...fakeSurvey, accessRole: "manager" });

    expect(await screen.findByText("초대 가능")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "빌더에서 수정" })).toHaveAttribute(
      "href",
      "/admin/surveys/survey-1/builder",
    );
    expect(screen.getByRole("link", { name: "설정" })).toHaveAttribute("href", "/admin/surveys/survey-1/settings");
  });
});
