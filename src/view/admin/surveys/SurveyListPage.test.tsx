import { screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { createFakeAdminApiController, fakeSurvey } from "../../../test/fakeAdminApiController";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { SurveyListPage } from "./SurveyListPage";

function renderSurveyList(controller = createFakeAdminApiController()) {
  return renderWithProviders(
    <MemoryRouter>
      <SurveyListPage />
    </MemoryRouter>,
    { controller },
  );
}

describe("SurveyListPage", () => {
  it("shows an empty state when no surveys exist", async () => {
    renderSurveyList();

    expect(await screen.findByText("아직 설문이 없습니다.")).toBeInTheDocument();
  });

  it("renders survey rows from the admin API boundary", async () => {
    renderSurveyList(
      createFakeAdminApiController({
        listSurveys: async () => [fakeSurvey],
      }),
    );

    expect(await screen.findByText("생활관 만족도 조사")).toBeInTheDocument();
    expect(screen.getByText("초안")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "생활관 만족도 조사 수정" })).toHaveAttribute(
      "href",
      "/admin/surveys/survey-1/builder",
    );
  });
});
