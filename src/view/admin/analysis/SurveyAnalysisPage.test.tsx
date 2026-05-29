import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminApiController } from "../../../api/admin/controller";
import type { FilterOptions, ImageTagAnswer, Question, SurveyAsset, SurveySection } from "../../../api/admin/model";
import { useAdminFilterStore } from "../../../store";
import { createFakeAdminApiController, fakeSurvey } from "../../../test/fakeAdminApiController";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { SurveyAnalysisPage } from "./SurveyAnalysisPage";

const sections: SurveySection[] = [
  {
    id: "section-1",
    surveyId: "survey-1",
    sectionKey: "facility",
    title: { ko: "시설" },
    orderIndex: 0,
    sectionType: "facility",
    settings: {},
  },
];

const questions: Question[] = [
  {
    id: "question-admin-image",
    surveyId: "survey-1",
    sectionId: "section-1",
    questionKey: "facility_pin",
    questionType: "image_tag",
    title: { ko: "복도 사진에서 불편한 지점을 표시해주세요." },
    orderIndex: 0,
    isRequired: false,
    metricType: "none",
    config: { assetId: "asset-1", maxTags: 3, tagTypes: ["미끄러움"], requireText: false, enableZoom: true },
    validation: {},
  },
  {
    id: "question-participant-upload",
    surveyId: "survey-1",
    sectionId: "section-1",
    questionKey: "facility_upload",
    questionType: "participant_image_tag",
    title: { ko: "직접 사진을 올려 불편한 지점을 표시해주세요." },
    orderIndex: 1,
    isRequired: false,
    metricType: "none",
    config: {
      maxTags: 3,
      tagTypes: ["수리 요청"],
      requireText: true,
      enableZoom: true,
      acceptedMimeTypes: ["image/png"],
      maxFileSizeMb: 5,
    },
    validation: {},
  },
];

const assets: SurveyAsset[] = [
  {
    id: "asset-1",
    surveyId: "survey-1",
    sectionId: "section-1",
    questionId: "question-admin-image",
    assetType: "image",
    storageBucket: "survey-assets",
    storagePath: "surveys/survey-1/facility.png",
    metadata: { signedUrl: "https://example.com/facility.png" },
    createdAt: "2026-05-28T00:00:00.000Z",
  },
];

const imageTagAnswers: ImageTagAnswer[] = [
  {
    id: "answer-admin-1",
    responseId: "response-1",
    sectionId: "section-1",
    sectionTitle: "시설",
    questionId: "question-admin-image",
    questionTitle: "복도 사진에서 불편한 지점을 표시해주세요.",
    questionType: "image_tag",
    kind: "admin_image",
    assetId: "asset-1",
    xRatio: 0.4,
    yRatio: 0.55,
    tagType: "미끄러움",
    textValue: "바닥 물기가 많습니다.",
    valueJson: {},
    responseProfile: { dormitory: "A동", roomType: "2인실", rc: "장기려" },
    createdAt: "2026-05-28T00:00:00.000Z",
  },
  {
    id: "answer-upload-1",
    responseId: "response-2",
    sectionId: "section-1",
    sectionTitle: "시설",
    questionId: "question-participant-upload",
    questionTitle: "직접 사진을 올려 불편한 지점을 표시해주세요.",
    questionType: "participant_image_tag",
    kind: "participant_upload",
    image: {
      storageBucket: "survey-assets",
      storagePath: "participant-uploads/survey-1/user-1/question-participant-upload/image.png",
      signedUrl: "https://example.com/upload.png",
      source: "participant_upload",
    },
    xRatio: 0.62,
    yRatio: 0.2,
    tagType: "수리 요청",
    textValue: "창틀이 흔들립니다.",
    valueJson: {},
    responseProfile: { dormitory: "B동", roomType: "3인실", department: "전산전자공학부" },
    createdAt: "2026-05-28T00:05:00.000Z",
  },
];

const filterOptions: FilterOptions = {
  genders: [],
  semesterGroups: [],
  departments: ["전산전자공학부"],
  rcs: ["장기려"],
  dormitories: ["A동", "B동"],
  roomTypes: ["2인실", "3인실"],
  dormExperiences: [],
};

function renderAnalysis(overrides: Partial<AdminApiController> = {}) {
  return renderWithProviders(
    <MemoryRouter initialEntries={["/admin/surveys/survey-1/analysis"]}>
      <Routes>
        <Route path="/admin/surveys/:surveyId/analysis" element={<SurveyAnalysisPage />} />
      </Routes>
    </MemoryRouter>,
    {
      controller: createFakeAdminApiController({
        getSurveyDetail: async () => ({
          survey: fakeSurvey,
          sections,
          questions,
          assets,
        }),
        getFilterOptions: async () => filterOptions,
        listImageTagAnswers: async () => imageTagAnswers,
        ...overrides,
      }),
    },
  );
}

describe("SurveyAnalysisPage", () => {
  beforeEach(() => {
    useAdminFilterStore.setState({ surveyId: undefined, filters: {}, activeTab: "overview" });
  });

  it("shows admin image tag answers and participant uploaded image tag answers", async () => {
    renderAnalysis();

    expect(await screen.findByRole("heading", { name: "생활관 만족도 조사" })).toBeInTheDocument();

    const adminSection = screen.getByRole("heading", { name: "관리자 이미지 태깅" }).closest("section");
    expect(adminSection).toBeTruthy();
    expect(within(adminSection!).getByRole("heading", { name: "복도 사진에서 불편한 지점을 표시해주세요." })).toBeInTheDocument();
    expect(within(adminSection!).getByText("미끄러움")).toBeInTheDocument();
    expect(within(adminSection!).getByText("바닥 물기가 많습니다.")).toBeInTheDocument();
    expect(within(adminSection!).getByText(/x 40%, y 55%/)).toBeInTheDocument();

    const participantSection = screen.getByRole("heading", { name: "참여자 업로드 태깅" }).closest("section");
    expect(participantSection).toBeTruthy();
    expect(within(participantSection!).getByRole("heading", { name: "직접 사진을 올려 불편한 지점을 표시해주세요." })).toBeInTheDocument();
    expect(within(participantSection!).getByText("수리 요청")).toBeInTheDocument();
    expect(within(participantSection!).getByText("창틀이 흔들립니다.")).toBeInTheDocument();
    expect(within(participantSection!).getByText(/x 62%, y 20%/)).toBeInTheDocument();
  });

  it("requests image tag answers again when a global filter changes", async () => {
    const user = userEvent.setup();
    const listImageTagAnswers = vi.fn<AdminApiController["listImageTagAnswers"]>(async () => imageTagAnswers);
    renderAnalysis({ listImageTagAnswers });

    await screen.findByRole("heading", { name: "생활관 만족도 조사" });
    await user.selectOptions(screen.getByLabelText("생활관"), "A동");

    await waitFor(() => {
      expect(listImageTagAnswers).toHaveBeenLastCalledWith({ surveyId: "survey-1", filters: { dormitory: "A동" } });
    });
  });
});
