import { screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { Survey } from "../../../api/admin/model";
import { createFakeAdminApiController, fakeSurvey } from "../../../test/fakeAdminApiController";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { SurveyDashboardPage } from "./SurveyDashboardPage";

function renderDashboard(survey: Survey = fakeSurvey) {
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

  it("hides builder and settings actions for shared viewer surveys", async () => {
    renderDashboard({ ...fakeSurvey, accessRole: "viewer" });

    expect(await screen.findByRole("heading", { name: "생활관 만족도 조사" })).toBeInTheDocument();
    expect(screen.getByText("결과 보기")).toBeInTheDocument();
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
});
