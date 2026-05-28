import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { AdminApiController } from "../../../api/admin/controller";
import type { PreviewSurveyCommand, Question, SurveyAsset, SurveySection } from "../../../api/admin/model";
import { createFakeAdminApiController, fakeSurvey } from "../../../test/fakeAdminApiController";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { SurveyPreviewPage } from "./SurveyPreviewPage";

const sections: SurveySection[] = [
  {
    id: "section-1",
    surveyId: "survey-1",
    sectionKey: "facility",
    title: { ko: "시설", en: "Facilities" },
    orderIndex: 0,
    sectionType: "facility",
    settings: {},
  },
  {
    id: "section-2",
    surveyId: "survey-1",
    sectionKey: "cafeteria",
    title: { ko: "식당", en: "Cafeteria" },
    orderIndex: 1,
    sectionType: "general",
    settings: {},
  },
];

const questions: Question[] = [
  {
    id: "question-1",
    surveyId: "survey-1",
    sectionId: "section-1",
    questionKey: "bed_satisfaction",
    questionType: "scale",
    title: { ko: "침대 상태에 만족하시나요?", en: "How satisfied are you with your bed?" },
    orderIndex: 0,
    isRequired: true,
    metricType: "satisfaction",
    config: {
      scaleMin: 1,
      scaleMax: 5,
      labelsKo: ["매우 불만족", "불만족", "보통", "만족", "매우 만족"],
      labelsEn: ["Very bad", "Bad", "Neutral", "Good", "Great"],
    },
    validation: {},
  },
  {
    id: "question-2",
    surveyId: "survey-1",
    sectionId: "section-1",
    questionKey: "bed_reason",
    questionType: "single_choice",
    title: { ko: "가장 큰 이유는 무엇인가요?", en: "What is the main reason?" },
    orderIndex: 1,
    isRequired: false,
    metricType: "none",
    config: {
      options: [
        { value: "mattress", labelKo: "매트리스", labelEn: "Mattress" },
        { value: "noise", labelKo: "소음", labelEn: "Noise" },
      ],
    },
    validation: {},
  },
  {
    id: "question-3",
    surveyId: "survey-1",
    sectionId: "section-2",
    questionKey: "cafeteria_feedback",
    questionType: "text",
    title: { ko: "식당 의견을 적어주세요.", en: "Share cafeteria feedback." },
    orderIndex: 0,
    isRequired: false,
    metricType: "none",
    config: {},
    validation: {},
  },
  {
    id: "question-4",
    surveyId: "survey-1",
    sectionId: "section-2",
    questionKey: "cafeteria_image",
    questionType: "image_tag",
    title: { ko: "불편한 지점을 표시해주세요." },
    orderIndex: 1,
    isRequired: false,
    metricType: "none",
    config: { assetId: "asset-1", maxTags: 2 },
    validation: {},
  },
];

const assets: SurveyAsset[] = [
  {
    id: "asset-1",
    surveyId: "survey-1",
    assetType: "image",
    storageBucket: "survey-assets",
    storagePath: "surveys/survey-1/images/cafeteria.png",
    metadata: { publicUrl: "https://example.com/cafeteria.png" },
    createdAt: "2026-05-28T00:00:00.000Z",
  },
];

function renderPreview(
  overrides: Partial<AdminApiController> = {},
  initialEntry = "/admin/surveys/survey-1/preview",
) {
  return renderWithProviders(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/admin/surveys/:surveyId/preview" element={<SurveyPreviewPage />} />
      </Routes>
    </MemoryRouter>,
    {
      controller: createFakeAdminApiController({
        getPreviewSurvey: async (command: PreviewSurveyCommand) => ({
          survey: fakeSurvey,
          sections,
          questions,
          assets,
          previewMode: true,
          options: command.options,
        }),
        ...overrides,
      }),
    },
  );
}

describe("SurveyPreviewPage", () => {
  it("loads draft preview with URL options", async () => {
    const getPreviewSurvey = vi.fn<AdminApiController["getPreviewSurvey"]>(async (command: PreviewSurveyCommand) => ({
      survey: fakeSurvey,
      sections,
      questions,
      assets,
      previewMode: true,
      options: command.options,
    }));

    renderPreview(
      { getPreviewSurvey },
      "/admin/surveys/survey-1/preview?locale=en&device=desktop&section_id=section-2",
    );

    await screen.findByRole("heading", { name: "생활관 만족도 조사", level: 1 });
    expect(screen.getByRole("heading", { name: "Cafeteria" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Facilities" })).not.toBeInTheDocument();

    await waitFor(() => {
      expect(getPreviewSurvey).toHaveBeenCalledWith({
        surveyId: "survey-1",
        options: { locale: "en", device: "desktop", sectionId: "section-2" },
      });
    });
  });

  it("simulates answers locally without extra preview fetches", async () => {
    const user = userEvent.setup();
    const getPreviewSurvey = vi.fn<AdminApiController["getPreviewSurvey"]>(async (command: PreviewSurveyCommand) => ({
      survey: fakeSurvey,
      sections,
      questions,
      assets,
      previewMode: true,
      options: command.options,
    }));
    renderPreview({ getPreviewSurvey });

    await screen.findByRole("heading", { name: "시설" });
    const scaleFive = screen.getByRole("button", { name: /5/ });
    await user.click(scaleFive);
    await user.click(screen.getByLabelText("매트리스"));

    expect(scaleFive).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("매트리스")).toBeChecked();
    const answeredMetric = within(screen.getByLabelText("미리보기 상태")).getByText("입력된 질문").closest("div");
    expect(answeredMetric).not.toBeNull();
    expect(within(answeredMetric as HTMLElement).getByText("2")).toBeInTheDocument();
    expect(getPreviewSurvey).toHaveBeenCalledTimes(1);
  });

  it("changes toolbar options through query-backed controls", async () => {
    const user = userEvent.setup();
    const getPreviewSurvey = vi.fn<AdminApiController["getPreviewSurvey"]>(async (command: PreviewSurveyCommand) => ({
      survey: fakeSurvey,
      sections,
      questions,
      assets,
      previewMode: true,
      options: command.options,
    }));
    renderPreview({ getPreviewSurvey });

    await screen.findByRole("heading", { name: "시설" });
    await user.click(screen.getByRole("button", { name: "EN" }));
    await user.selectOptions(screen.getByLabelText("섹션"), "section-2");

    expect(await screen.findByRole("heading", { name: "Cafeteria" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Facilities" })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(getPreviewSurvey).toHaveBeenLastCalledWith({
        surveyId: "survey-1",
        options: { locale: "en", device: "mobile", sectionId: "section-2" },
      });
    });
  });
});
