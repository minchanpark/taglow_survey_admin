import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminApiController } from "../../../api/admin/controller";
import type { IdentityResponse, ImageTagAnswer, Question, ResponseSummary, SurveyAsset, SurveySection } from "../../../api/admin/model";
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
    id: "question-satisfaction",
    surveyId: "survey-1",
    sectionId: "section-1",
    questionKey: "laundry_satisfaction",
    questionType: "scale",
    title: { ko: "세탁실 만족도" },
    orderIndex: 2,
    isRequired: true,
    metricType: "satisfaction",
    topicKey: "laundry",
    config: { scaleMin: 1, scaleMax: 5, labelsKo: ["매우 불만족", "매우 만족"] },
    validation: {},
  },
  {
    id: "question-importance",
    surveyId: "survey-1",
    sectionId: "section-1",
    questionKey: "laundry_importance",
    questionType: "scale",
    title: { ko: "세탁실 중요도" },
    orderIndex: 3,
    isRequired: true,
    metricType: "importance",
    topicKey: "laundry",
    config: { scaleMin: 1, scaleMax: 5, labelsKo: ["전혀 중요하지 않음", "매우 중요"] },
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

const identityResponses: IdentityResponse[] = [
  {
    responseId: "response-1",
    studentNumber: "22000123",
    name: "김태글",
    profile: { dormitory: "비전관", roomType: "2인실", rc: "장기려" },
    submittedAt: "2026-05-28T00:00:00.000Z",
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
        listImageTagAnswers: async () => ({ items: imageTagAnswers }),
        listIdentityResponses: async () => ({ items: identityResponses }),
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
    await user.click(screen.getByRole("button", { name: "사진 표시" }));

    const adminSection = screen.getByRole("heading", { name: "준비된 사진 위 표시" }).closest("section");
    expect(adminSection).toBeTruthy();
    expect(within(adminSection!).getByRole("heading", { name: "복도 사진에서 불편한 지점을 표시해주세요." })).toBeInTheDocument();
    expect(within(adminSection!).getByText("미끄러움")).toBeInTheDocument();
    expect(within(adminSection!).getByText("바닥 물기가 많습니다.")).toBeInTheDocument();
    expect(within(adminSection!).getByText(/가로 40% · 세로 55%/)).toBeInTheDocument();

    const participantSection = screen.getByRole("heading", { name: "참여자가 올린 사진 위 표시" }).closest("section");
    expect(participantSection).toBeTruthy();
    expect(within(participantSection!).getByRole("heading", { name: "직접 사진을 올려 불편한 지점을 표시해주세요." })).toBeInTheDocument();
    expect(within(participantSection!).getByText("수리 요청")).toBeInTheDocument();
    expect(within(participantSection!).getByText("창틀이 흔들립니다.")).toBeInTheDocument();
    expect(within(participantSection!).getByText(/가로 62% · 세로 20%/)).toBeInTheDocument();
  });

  it("uses response summary for header metrics and keeps the route survey as the analysis version", async () => {
    renderAnalysis({ getResponseSummary: async () => baseResponseSummary });

    expect(await screen.findByRole("heading", { name: "생활관 만족도 조사" })).toBeInTheDocument();

    const metrics = screen.getByLabelText("응답 현황");
    expect(within(metrics).getByText("제출 완료")).toBeInTheDocument();
    expect(within(metrics).getByText("4")).toBeInTheDocument();
    expect(within(metrics).getByText("전체 응답")).toBeInTheDocument();
    expect(within(metrics).getByText("5")).toBeInTheDocument();
    expect(within(metrics).getByText("설문 버전")).toBeInTheDocument();
    expect(within(metrics).getByText("v1")).toBeInTheDocument();
    expect(within(metrics).getByText("현재 설문")).toBeInTheDocument();
    expect(within(metrics).getByText("해석 주의")).toBeInTheDocument();
  });

  it("requests image tag answers again when a global filter changes", async () => {
    const user = userEvent.setup();
    const listImageTagAnswers = vi.fn<AdminApiController["listImageTagAnswers"]>(async () => ({ items: imageTagAnswers }));
    renderAnalysis({ listImageTagAnswers });

    await screen.findByRole("heading", { name: "생활관 만족도 조사" });
    await user.click(screen.getByRole("button", { name: "사진 표시" }));
    await user.selectOptions(screen.getByLabelText("거주 생활관"), "비전관");

    await waitFor(() => {
      expect(listImageTagAnswers).toHaveBeenLastCalledWith({ surveyId: "survey-1", filters: { dormitory: "비전관", cursor: undefined, limit: 50 } });
    });
  });

  it("uses profile question choices as the analysis filter criteria", async () => {
    renderAnalysis();

    await screen.findByRole("heading", { name: "생활관 만족도 조사" });

    expect(screen.getByLabelText("거주 생활관")).toHaveDisplayValue("전체");
    expect(screen.getByRole("option", { name: "커스텀관" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "은혜관" })).not.toBeInTheDocument();
  });

  it("narrows filter controls with analysis filter options while preserving question labels", async () => {
    const getFilterOptions = vi.fn<AdminApiController["getFilterOptions"]>(async () => ({
      genders: [],
      semesterGroups: [],
      departments: [],
      rcs: [],
      dormitories: ["커스텀관"],
      roomTypes: [],
      dormExperiences: [],
    }));
    renderAnalysis({ getFilterOptions });

    await screen.findByRole("heading", { name: "생활관 만족도 조사" });

    await waitFor(() => {
      expect(getFilterOptions).toHaveBeenCalledWith("survey-1");
    });
    expect(screen.getByRole("option", { name: "커스텀관" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "비전관" })).not.toBeInTheDocument();
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

    const summaryCard = screen.getByRole("heading", { name: "응답 현황" }).closest("article");
    expect(summaryCard).toBeTruthy();
    expect(within(summaryCard!).getByText("조건 적용 응답")).toBeInTheDocument();
    expect(
      within(screen.getByLabelText("응답 조건 선택")).getByText((_, element) =>
        Boolean(element?.classList.contains("tg-analysis-filter__summary") && element.textContent?.includes("조건 적용 2명 / 전체 4명")),
      ),
    ).toBeInTheDocument();

    const distributionCard = screen.getByRole("heading", { name: "기본 정보별 응답" }).closest("article");
    expect(distributionCard).toBeTruthy();
    expect(within(distributionCard!).getByText("조건 1개 적용 · 응답 비율")).toBeInTheDocument();
    expect(within(distributionCard!).getByText("비전관")).toBeInTheDocument();
    expect(within(distributionCard!).queryByText("커스텀관")).not.toBeInTheDocument();
  });

  it("shows student number and name responses that passed attention checks", async () => {
    const user = userEvent.setup();
    renderAnalysis();

    expect(await screen.findByRole("heading", { name: "생활관 만족도 조사" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "상세 명단" }));

    const identityCard = (await screen.findByRole("heading", { name: "상세 명단" })).closest("article");
    expect(identityCard).toBeTruthy();
    expect(within(identityCard!).getByText(/주의력 확인 통과 응답만/)).toBeInTheDocument();
    expect(within(identityCard!).getByText("22000123")).toBeInTheDocument();
    expect(within(identityCard!).getByText("김태글")).toBeInTheDocument();
    expect(within(identityCard!).getByText("비전관 · 2인실 · 장기려")).toBeInTheDocument();
  });

  it("requests identity responses again when a global filter changes", async () => {
    const user = userEvent.setup();
    const listIdentityResponses = vi.fn<AdminApiController["listIdentityResponses"]>(async () => ({ items: identityResponses }));
    renderAnalysis({ listIdentityResponses });

    await screen.findByRole("heading", { name: "생활관 만족도 조사" });
    await user.click(screen.getByRole("button", { name: "상세 명단" }));
    await user.selectOptions(screen.getByLabelText("거주 생활관"), "비전관");

    await waitFor(() => {
      expect(listIdentityResponses).toHaveBeenLastCalledWith({ surveyId: "survey-1", filters: { dormitory: "비전관", cursor: undefined, limit: 100 } });
    });
  });

  it("shows improvement priority TOP 5 with evidence counts and low sample caution", async () => {
    const getPriorityTop5 = vi.fn<AdminApiController["getPriorityTop5"]>(async () => [
      {
        id: "laundry",
        label: "세탁기 및 건조기 관리",
        source: "mixed",
        topicKey: "laundry",
        sectionTitle: "시설",
        averageImportance: 4.7,
        averageSatisfaction: 2.1,
        gap: 2.6,
        borichScore: 12.22,
        textCount: 3,
        tagCount: 2,
        n: 8,
      },
    ]);
    renderAnalysis({ getPriorityTop5 });

    await screen.findByRole("heading", { name: "생활관 만족도 조사" });

    await waitFor(() => {
      expect(getPriorityTop5).toHaveBeenCalledWith({ surveyId: "survey-1", filters: {} });
    });

    const priorityCard = screen.getByRole("heading", { name: "먼저 볼 개선 항목 5개" }).closest("article");
    expect(priorityCard).toBeTruthy();
    expect(within(priorityCard!).getByText("세탁기 및 건조기 관리")).toBeInTheDocument();
    expect(within(priorityCard!).getByText(/만족도 2.10 · 응답 수 8명 · 해석 주의/)).toBeInTheDocument();
    expect(within(priorityCard!).getByText(/서술형 의견 3개 · 사진 표시 2개/)).toBeInTheDocument();
    expect(within(priorityCard!).getByText("여러 근거")).toBeInTheDocument();
    expect(within(priorityCard!).queryByText(/중요도|개선 필요 점수|차이/)).not.toBeInTheDocument();
  });

  it("shows satisfaction averages and choice ratios without importance-based cards", async () => {
    const user = userEvent.setup();
    renderAnalysis({
      getSectionSatisfactionSummary: async () => [
        { sectionId: "section-1", sectionTitle: "시설", averageScore: 2.8, n: 8 },
      ],
      getQuestionSatisfactionSummary: async () => [
        {
          questionId: "question-satisfaction",
          questionTitle: "세탁실 만족도",
          sectionId: "section-1",
          sectionTitle: "시설",
          topicKey: "laundry",
          metricType: "satisfaction",
          averageScore: 2.5,
          standardDeviation: 0.8,
          n: 8,
        },
        {
          questionId: "question-importance",
          questionTitle: "세탁실 중요도",
          sectionId: "section-1",
          sectionTitle: "시설",
          topicKey: "laundry",
          metricType: "importance",
          averageScore: 4.6,
          standardDeviation: 0.5,
          n: 12,
        },
      ],
      getChoiceDistribution: async () => [
        {
          questionId: "question-choice",
          questionTitle: "불편 유형",
          sectionId: "section-1",
          sectionTitle: "시설",
          optionValue: "clean",
          optionLabel: "청결",
          count: 7,
          n: 10,
          percentage: 70,
        },
        {
          questionId: "question-choice",
          questionTitle: "불편 유형",
          sectionId: "section-1",
          sectionTitle: "시설",
          optionValue: "noise",
          optionLabel: "소음",
          count: 3,
          n: 10,
          percentage: 30,
        },
      ],
    });

    await screen.findByRole("heading", { name: "생활관 만족도 조사" });
    await user.click(screen.getByRole("button", { name: "점수 문항" }));

    expect(screen.getByRole("heading", { name: "주제별 만족도" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "질문별 점수" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "문항별 응답 분포" })).toBeInTheDocument();
    expect(screen.getByText("세탁실 만족도")).toBeInTheDocument();
    expect(screen.queryByText("세탁실 중요도")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "만족도와 중요도 차이" })).not.toBeInTheDocument();
    expect(screen.getByText("청결")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "개선 필요 점수" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "개선 필요도" })).not.toBeInTheDocument();
  });

  it("shows all question scores and response distributions with search controls", async () => {
    const user = userEvent.setup();
    renderAnalysis({
      getQuestionSatisfactionSummary: async () =>
        Array.from({ length: 13 }, (_, index) => ({
          questionId: `score-${index + 1}`,
          questionTitle: `점수 질문 ${index + 1}`,
          sectionId: "section-1",
          sectionTitle: "시설",
          topicKey: "facility",
          metricType: "satisfaction",
          averageScore: 3 + index / 100,
          standardDeviation: 0,
          n: 11,
        })),
      getChoiceDistribution: async () =>
        Array.from({ length: 5 }, (_, index) => ({
          questionId: `distribution-${index + 1}`,
          questionTitle: `분포 문항 ${index + 1}`,
          sectionId: "section-1",
          sectionTitle: "시설",
          optionValue: "yes",
          optionLabel: "예",
          count: 8,
          n: 11,
          percentage: 72.7,
        })),
    });

    await screen.findByRole("heading", { name: "생활관 만족도 조사" });
    await user.click(screen.getByRole("button", { name: "점수 문항" }));

    const questionCard = screen.getByRole("heading", { name: "질문별 점수" }).closest("article");
    expect(questionCard).toBeTruthy();
    expect(within(questionCard!).getByText("점수 질문 13")).toBeInTheDocument();
    expect(within(questionCard!).getByText("표시 중 13개 / 전체 13개")).toBeInTheDocument();

    const distributionCard = screen.getByRole("heading", { name: "문항별 응답 분포" }).closest("article");
    expect(distributionCard).toBeTruthy();
    expect(within(distributionCard!).getByRole("heading", { name: "분포 문항 5" })).toBeInTheDocument();
    expect(within(distributionCard!).getByText("표시 중 5개 / 전체 5개")).toBeInTheDocument();

    await user.type(within(questionCard!).getByLabelText("질문 검색"), "13");
    expect(within(questionCard!).getByText("점수 질문 13")).toBeInTheDocument();
    expect(within(questionCard!).queryByText("점수 질문 1")).not.toBeInTheDocument();

    await user.type(within(distributionCard!).getByLabelText("문항 검색"), "5");
    expect(within(distributionCard!).getByRole("heading", { name: "분포 문항 5" })).toBeInTheDocument();
    expect(within(distributionCard!).queryByRole("heading", { name: "분포 문항 1" })).not.toBeInTheDocument();
  });

  it("requests group comparison by selected group, metric, and target", async () => {
    const user = userEvent.setup();
    const getGroupCompareSummary = vi.fn<AdminApiController["getGroupCompareSummary"]>(async () => [
      {
        groupKey: "2인실",
        groupLabel: "2인실",
        averageScore: 4.2,
        n: 12,
        isHighest: true,
        isLowest: false,
        isLowSample: false,
      },
      {
        groupKey: "3인실",
        groupLabel: "3인실",
        averageScore: 2.1,
        n: 4,
        isHighest: false,
        isLowest: true,
        isLowSample: true,
      },
    ]);
    renderAnalysis({ getGroupCompareSummary });

    await screen.findByRole("heading", { name: "생활관 만족도 조사" });
    await user.click(screen.getByRole("button", { name: "그룹별 비교" }));
    await user.selectOptions(screen.getByLabelText("나눠 볼 기준"), "roomType");
    await user.selectOptions(screen.getByLabelText("비교할 항목"), "question:question-satisfaction");

    await waitFor(() => {
      expect(getGroupCompareSummary).toHaveBeenLastCalledWith({
        surveyId: "survey-1",
        filters: {
          groupBy: "roomType",
          metricType: "satisfaction",
          targetKind: "question",
          targetId: "question-satisfaction",
        },
      });
    });

    const groupCard = screen.getByRole("heading", { name: "그룹별 비교" }).closest("article");
    expect(groupCard).toBeTruthy();
    expect(within(groupCard!).getByRole("option", { name: "질문 · 세탁실 만족도" })).toBeInTheDocument();
    expect(within(groupCard!).queryByRole("option", { name: "질문 · 세탁실 중요도" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("비교할 점수")).not.toBeInTheDocument();
    expect(within(groupCard!).getByText("최고")).toBeInTheDocument();
    expect(within(groupCard!).getByText("최저")).toBeInTheDocument();
    expect(within(groupCard!).getByText("해석 주의")).toBeInTheDocument();
  });
});
