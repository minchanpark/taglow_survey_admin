import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminApiController } from "../../../api/admin/controller";
import type { ImageTagAnswer, Question, ResponseSummary, SurveyAsset, SurveySection } from "../../../api/admin/model";
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
    id: "question-profile-dormitory",
    surveyId: "survey-1",
    sectionId: "section-1",
    questionKey: "profile_dormitory",
    questionType: "profile",
    title: { ko: "거주 생활관" },
    orderIndex: -2,
    isRequired: true,
    metricType: "none",
    config: {
      profileField: "dormitory",
      inputType: "single_choice",
      options: [
        { value: "비전관", labelKo: "비전관" },
        { value: "커스텀관", labelKo: "커스텀관" },
      ],
    },
    validation: {},
  },
  {
    id: "question-profile-room",
    surveyId: "survey-1",
    sectionId: "section-1",
    questionKey: "profile_room_type",
    questionType: "profile",
    title: { ko: "인실" },
    orderIndex: -1,
    isRequired: true,
    metricType: "none",
    config: {
      profileField: "room_type",
      inputType: "single_choice",
      options: [
        { value: "2인실", labelKo: "2인실" },
        { value: "3인실", labelKo: "3인실" },
      ],
    },
    validation: {},
  },
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

const baseResponseSummary: ResponseSummary = {
  totalResponses: 5,
  submittedResponses: 4,
  filteredResponses: 4,
  lowSampleThreshold: 10,
  isLowSample: true,
  profileDistribution: {
    gender: [],
    semesterGroup: [],
    department: [],
    rc: [],
    dormitory: [
      { key: "비전관", label: "비전관", n: 2, percentage: 50 },
      { key: "커스텀관", label: "커스텀관", n: 2, percentage: 50 },
    ],
    roomType: [
      { key: "2인실", label: "2인실", n: 3, percentage: 75 },
      { key: "3인실", label: "3인실", n: 1, percentage: 25 },
    ],
    dormExperience: [],
  },
  lowSampleGroups: [],
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
    const user = userEvent.setup();
    renderAnalysis();

    expect(await screen.findByRole("heading", { name: "생활관 만족도 조사" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "공간 태깅" }));

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
    await user.selectOptions(screen.getByLabelText("거주 생활관"), "비전관");

    await waitFor(() => {
      expect(listImageTagAnswers).toHaveBeenLastCalledWith({ surveyId: "survey-1", filters: { dormitory: "비전관" } });
    });
  });

  it("uses profile question choices as the analysis filter criteria", async () => {
    renderAnalysis();

    await screen.findByRole("heading", { name: "생활관 만족도 조사" });

    expect(screen.getByLabelText("거주 생활관")).toHaveDisplayValue("전체");
    expect(screen.getByRole("option", { name: "커스텀관" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "은혜관" })).not.toBeInTheDocument();
  });

  it("updates response summary and profile distribution cards when a global filter changes", async () => {
    const user = userEvent.setup();
    const getResponseSummary = vi.fn<AdminApiController["getResponseSummary"]>(async (command) =>
      command.filters.dormitory
        ? {
            ...baseResponseSummary,
            filteredResponses: 2,
            profileDistribution: {
              ...baseResponseSummary.profileDistribution,
              dormitory: [
                { key: "비전관", label: "비전관", n: 2, percentage: 100 },
                { key: "커스텀관", label: "커스텀관", n: 0, percentage: 0 },
              ],
              roomType: [
                { key: "2인실", label: "2인실", n: 2, percentage: 100 },
                { key: "3인실", label: "3인실", n: 0, percentage: 0 },
              ],
            },
          }
        : baseResponseSummary,
    );
    renderAnalysis({ getResponseSummary });

    await screen.findByRole("heading", { name: "생활관 만족도 조사" });
    await user.selectOptions(screen.getByLabelText("거주 생활관"), "비전관");

    await waitFor(() => {
      expect(getResponseSummary).toHaveBeenLastCalledWith({ surveyId: "survey-1", filters: { dormitory: "비전관" } });
    });

    const summaryCard = screen.getByRole("heading", { name: "응답 요약" }).closest("article");
    expect(summaryCard).toBeTruthy();
    expect(within(summaryCard!).getByText("필터 적용 응답")).toBeInTheDocument();

    const distributionCard = screen.getByRole("heading", { name: "기본 정보 분포" }).closest("article");
    expect(distributionCard).toBeTruthy();
    expect(within(distributionCard!).getByText("필터 1개 적용 · 응답 비율")).toBeInTheDocument();
    expect(within(distributionCard!).getByText("비전관")).toBeInTheDocument();
    expect(within(distributionCard!).queryByText("커스텀관")).not.toBeInTheDocument();
  });
});
