import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFakeAdminApiController, fakeSurvey, sharedSurveySession } from "../../../test/fakeAdminApiController";
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
  afterEach(() => {
    vi.restoreAllMocks();
  });

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
    expect(screen.getAllByText("내 설문")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "생활관 만족도 조사 수정" })).toHaveAttribute(
      "href",
      "/admin/surveys/survey-1/builder",
    );
  });

  it("shows shared viewer surveys as analysis-only rows", async () => {
    renderSurveyList(
      createFakeAdminApiController({
        getAdminSessionState: async () => sharedSurveySession,
        listSurveys: async () => [{ ...fakeSurvey, accessRole: "viewer" }],
      }),
    );

    expect(await screen.findByText("생활관 만족도 조사")).toBeInTheDocument();
    expect(screen.getByText("공유받음")).toBeInTheDocument();
    expect(screen.getByText("결과 보기")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "생활관 만족도 조사 분석 보기" })).toHaveAttribute(
      "href",
      "/admin/surveys/survey-1/analysis",
    );
    expect(screen.queryByRole("link", { name: "생활관 만족도 조사 수정" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "생활관 만족도 조사 삭제" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /새 설문/ })).not.toBeInTheDocument();
  });

  it("shows shared editor surveys as editable rows without owner actions", async () => {
    renderSurveyList(
      createFakeAdminApiController({
        getAdminSessionState: async () => sharedSurveySession,
        listSurveys: async () => [{ ...fakeSurvey, accessRole: "editor" }],
      }),
    );

    expect(await screen.findByText("작업 가능")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "생활관 만족도 조사 수정" })).toHaveAttribute(
      "href",
      "/admin/surveys/survey-1/builder",
    );
    expect(screen.queryByRole("button", { name: "생활관 만족도 조사 삭제" })).not.toBeInTheDocument();
  });

  it("deletes a draft survey through the admin API boundary after confirmation", async () => {
    const user = userEvent.setup();
    const deleteSurvey = vi.fn(async () => undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderSurveyList(
      createFakeAdminApiController({
        listSurveys: async () => [fakeSurvey],
        deleteSurvey,
      }),
    );

    await user.click(await screen.findByRole("button", { name: "생활관 만족도 조사 삭제" }));

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("생활관 만족도 조사"));
    expect(deleteSurvey).toHaveBeenCalledWith("survey-1");
    expect(await screen.findByRole("status")).toHaveTextContent("설문을 삭제했습니다.");
  });

  it("shows archived surveys only in the archive view", async () => {
    const user = userEvent.setup();
    renderSurveyList(
      createFakeAdminApiController({
        listSurveys: async () => [
          fakeSurvey,
          { ...fakeSurvey, id: "survey-archived", title: "보관된 설문", status: "archived" },
        ],
      }),
    );

    expect(await screen.findByText("생활관 만족도 조사")).toBeInTheDocument();
    expect(screen.queryByText("보관된 설문")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "보관함 1개" }));

    expect(await screen.findByText("보관된 설문")).toBeInTheDocument();
    expect(screen.queryByText("생활관 만족도 조사")).not.toBeInTheDocument();
  });

  it("archives a closed survey through the admin API boundary", async () => {
    const user = userEvent.setup();
    const archiveSurvey = vi.fn(async (surveyId: string) => ({ ...fakeSurvey, id: surveyId, status: "archived" as const }));
    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderSurveyList(
      createFakeAdminApiController({
        listSurveys: async () => [{ ...fakeSurvey, status: "closed" }],
        archiveSurvey,
      }),
    );

    await user.click(await screen.findByRole("button", { name: "생활관 만족도 조사 보관" }));

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("보관할까요"));
    expect(archiveSurvey).toHaveBeenCalledWith("survey-1");
    expect(await screen.findByRole("status")).toHaveTextContent("설문을 보관했습니다.");
  });

  it("allows closed surveys to be permanently deleted", async () => {
    const user = userEvent.setup();
    const deleteSurvey = vi.fn(async () => undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderSurveyList(
      createFakeAdminApiController({
        listSurveys: async () => [{ ...fakeSurvey, status: "closed" }],
        deleteSurvey,
      }),
    );

    await user.click(await screen.findByRole("button", { name: "생활관 만족도 조사 삭제" }));

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("영구 삭제"));
    expect(deleteSurvey).toHaveBeenCalledWith("survey-1");
  });

  it("keeps published surveys from being deleted in the list", async () => {
    renderSurveyList(
      createFakeAdminApiController({
        listSurveys: async () => [{ ...fakeSurvey, status: "published" }],
      }),
    );

    expect(await screen.findByRole("button", { name: "생활관 만족도 조사 삭제" })).toBeDisabled();
  });
});
