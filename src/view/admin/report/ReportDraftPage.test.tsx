import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminApiController } from "../../../api/admin/controller";
import type { ResponseSummary, SurveySection, Question, ReportNarrativeCommand } from "../../../api/admin/model";
import { useAdminReportStore } from "../../../store";
import { createFakeAdminApiController, fakeSurvey } from "../../../test/fakeAdminApiController";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { ReportDraftPage } from "./ReportDraftPage";

const responseSummary: ResponseSummary = {
  totalResponses: 12,
  submittedResponses: 10,
  filteredResponses: 8,
  lowSampleThreshold: 10,
  isLowSample: true,
  profileDistribution: {
    gender: [],
    semesterGroup: [],
    department: [],
    rc: [],
    dormitory: [{ key: "비전관", label: "비전관", n: 8, percentage: 100 }],
    roomType: [],
    dormExperience: [],
  },
};

const sections: SurveySection[] = [
  {
    id: "section-1",
    surveyId: "survey-1",
    sectionKey: "facility",
    title: { ko: "시설" },
    orderIndex: 0,
    sectionType: "general",
    settings: {},
  },
];

const questions: Question[] = [
  {
    id: "question-1",
    surveyId: "survey-1",
    sectionId: "section-1",
    questionKey: "laundry",
    questionType: "scale",
    title: { ko: "세탁실 만족도" },
    orderIndex: 0,
    isRequired: true,
    metricType: "satisfaction",
    config: {},
    validation: {},
  },
];

function renderReport(overrides: Partial<AdminApiController> = {}) {
  return renderWithProviders(
    <MemoryRouter initialEntries={["/admin/surveys/survey-1/report"]}>
      <Routes>
        <Route path="/admin/surveys/:surveyId/report" element={<ReportDraftPage />} />
      </Routes>
    </MemoryRouter>,
    {
      controller: createFakeAdminApiController({
        getSurveyDetail: async () => ({ survey: fakeSurvey, sections, questions, assets: [] }),
        getResponseSummary: async () => responseSummary,
        getPriorityTop5: async () => [
          {
            id: "priority-1",
            label: "세탁실 혼잡",
            source: "low_satisfaction",
            averageImportance: null,
            averageSatisfaction: 2.1,
            gap: null,
            borichScore: null,
            textCount: 2,
            tagCount: 1,
            n: 8,
          },
        ],
        getSectionSatisfactionSummary: async () => [{ sectionId: "section-1", sectionTitle: "시설", averageScore: 2.5, n: 8 }],
        getQuestionSatisfactionSummary: async () => [
          {
            questionId: "question-1",
            questionTitle: "세탁실 만족도",
            averageScore: 2.1,
            standardDeviation: null,
            n: 8,
            metricType: "satisfaction",
          },
        ],
        getTextGroups: async () => [{ groupKey: "text-1", label: "세탁 대기", count: 2, n: 8, representativeTexts: ["세탁기가 부족합니다."] }],
        listTextAnswers: async () => ({ items: [{ id: "answer-1", textValue: "세탁기가 부족합니다.", valueJson: {}, createdAt: "2026-06-04T00:00:00.000Z" }] }),
        ...overrides,
      }),
    },
  );
}

describe("ReportDraftPage", () => {
  beforeEach(() => {
    useAdminReportStore.getState().resetReport();
  });

  it("renders analysis query data by default in development mode", async () => {
    renderReport();

    expect(await screen.findByRole("heading", { name: "생활관 만족도 조사" })).toBeInTheDocument();
    expect(await screen.findByText("개발 모드 샘플 데이터")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "샘플 데이터 사용" })).not.toBeChecked();
    expect(screen.getAllByText(/세탁실 혼잡/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/소수/).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "핵심 요약" })).toBeInTheDocument();
    expect(screen.getAllByText("시각화 근거").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "응답 현황" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "먼저 볼 개선 항목 5개" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "주제별 만족도" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "서술형 의견 모음" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "사진 표시 위치" })).not.toBeInTheDocument();
  });

  it("can switch to dev-only sample data", async () => {
    renderReport();

    await userEvent.click(await screen.findByRole("checkbox", { name: "샘플 데이터 사용" }));
    expect(screen.getByRole("checkbox", { name: "샘플 데이터 사용" })).toBeChecked();
    expect(screen.getByText("2026-1 생활관 만족도 분석 보고서")).toBeInTheDocument();
    expect(screen.getAllByText(/세탁실 대기와 건조 공간 부족/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/충분한 수준/).length).toBeGreaterThan(0);
  });

  it("uses sample data for AI only when the sample checkbox is enabled", async () => {
    const generateReportNarrative = vi.fn(async (command: ReportNarrativeCommand) => ({
      generatedAt: "2026-06-05T00:00:00.000Z",
      blocks: command.blocks.map((block) => ({
        blockId: block.id,
        summary: `AI ${block.title} 요약입니다.`,
        body: [`AI가 ${block.title} 본문을 확장했습니다.`],
        evidenceIds: [],
        caution: undefined,
        suggestedActions: [],
      })),
    }));
    renderReport({
      getResponseSummary: async () => ({
        ...responseSummary,
        totalResponses: 0,
        submittedResponses: 0,
        filteredResponses: 0,
        isLowSample: false,
        profileDistribution: {
          gender: [],
          semesterGroup: [],
          department: [],
          rc: [],
          dormitory: [],
          roomType: [],
          dormExperience: [],
        },
      }),
      getPriorityTop5: async () => [],
      getSectionSatisfactionSummary: async () => [],
      getQuestionSatisfactionSummary: async () => [],
      getChoiceDistribution: async () => [],
      getTextGroups: async () => [],
      listTextAnswers: async () => ({ items: [] }),
      generateReportNarrative,
    });

    expect(await screen.findByText("실제 분석 데이터가 비어 있습니다. 샘플 데이터 사용을 켜면 임시 데이터로 미리볼 수 있습니다.")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "샘플 데이터 사용" })).not.toBeChecked();
    expect(screen.queryByText("2026-1 생활관 만족도 분석 보고서")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("checkbox", { name: "샘플 데이터 사용" }));
    await userEvent.click(screen.getByRole("button", { name: "AI 초안 생성" }));

    await waitFor(() => expect(generateReportNarrative).toHaveBeenCalled());
    const command = generateReportNarrative.mock.calls[0]?.[0];
    expect(command?.blocks.find((block) => block.id === "priority")?.summary).toContain("세탁실 대기와 건조 공간 부족");
  });

  it("keeps the sample checkbox controllable when analysis query data is empty", async () => {
    renderReport({
      getResponseSummary: async () => ({
        ...responseSummary,
        totalResponses: 0,
        submittedResponses: 0,
        filteredResponses: 0,
        isLowSample: false,
        profileDistribution: {
          gender: [],
          semesterGroup: [],
          department: [],
          rc: [],
          dormitory: [],
          roomType: [],
          dormExperience: [],
        },
      }),
      getPriorityTop5: async () => [],
      getSectionSatisfactionSummary: async () => [],
      getQuestionSatisfactionSummary: async () => [],
      getChoiceDistribution: async () => [],
      getTextGroups: async () => [],
      listTextAnswers: async () => ({ items: [] }),
    });

    const checkbox = await screen.findByRole("checkbox", { name: "샘플 데이터 사용" });
    expect(checkbox).not.toBeChecked();

    await userEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    await userEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
    expect(screen.getByText("실제 분석 데이터가 비어 있습니다. 샘플 데이터 사용을 켜면 임시 데이터로 미리볼 수 있습니다.")).toBeInTheDocument();
    expect(screen.queryByText("2026-1 생활관 만족도 분석 보고서")).not.toBeInTheDocument();
  });

  it("edits summaries and exports markdown", async () => {
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:report");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    useAdminReportStore.getState().setUseSampleData(false);
    renderReport();

    const summary = await screen.findByLabelText("요약 편집 주요 요약");
    await userEvent.clear(summary);
    await userEvent.type(summary, "관리자가 편집한 요약입니다.");
    await userEvent.click(screen.getByRole("button", { name: /Markdown/ }));

    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(createObjectURL).toHaveBeenCalled();
    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
    click.mockRestore();
  });

  it("applies AI narrative results to summary editors and preview", async () => {
    const generateReportNarrative = vi.fn(async (command: ReportNarrativeCommand) => ({
      generatedAt: "2026-06-05T00:00:00.000Z",
      blocks: command.blocks.map((block) => ({
        blockId: block.id,
        summary: `AI ${block.title} 요약입니다.`,
        body: [`AI가 ${block.title} 본문을 확장했습니다.`],
        evidenceIds: block.evidence.slice(0, 1).map((evidence) => evidence.id),
        caution: block.isLowSample ? "응답이 적어 방향성 참고용으로 해석합니다." : undefined,
        suggestedActions: [`${block.title} 후속 조치`],
      })),
    }));
    renderReport({ generateReportNarrative });

    await userEvent.click(await screen.findByRole("button", { name: "AI 초안 생성" }));

    expect(await screen.findByText("AI 초안을 생성했습니다.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("요약 편집 주요 요약")).toHaveValue("AI 주요 요약 요약입니다."));
    expect(screen.getByText("AI가 주요 요약 본문을 확장했습니다.")).toBeInTheDocument();
    expect(screen.getByText("주요 요약 후속 조치")).toBeInTheDocument();
  });

  it("sends source analysis summaries to AI instead of previously edited summaries", async () => {
    const generateReportNarrative = vi.fn(async (command: ReportNarrativeCommand) => ({
      generatedAt: "2026-06-05T00:00:00.000Z",
      blocks: command.blocks.map((block) => ({
        blockId: block.id,
        summary: `AI ${block.title} 요약입니다.`,
        body: [`AI가 ${block.title} 본문을 확장했습니다.`],
        evidenceIds: [],
        caution: undefined,
        suggestedActions: [],
      })),
    }));
    renderReport({ generateReportNarrative });

    const summary = await screen.findByLabelText("요약 편집 주요 요약");
    await userEvent.clear(summary);
    await userEvent.type(summary, "관리자가 편집한 요약입니다.");
    await userEvent.click(screen.getByRole("button", { name: "AI 초안 생성" }));

    await waitFor(() => expect(generateReportNarrative).toHaveBeenCalled());
    const command = generateReportNarrative.mock.calls[0]?.[0];
    const priorityBlock = command?.blocks.find((block) => block.id === "priority");
    expect(priorityBlock?.summary).toContain("세탁실 혼잡");
    expect(priorityBlock?.summary).not.toBe("관리자가 편집한 요약입니다.");
  });

  it("keeps manual editing available when AI narrative generation fails", async () => {
    renderReport({
      generateReportNarrative: async () => {
        throw new Error("provider unavailable");
      },
    });

    await userEvent.click(await screen.findByRole("button", { name: "AI 초안 생성" }));

    expect(await screen.findByText("AI 초안을 생성하지 못했습니다. 규칙 기반 초안과 수동 편집은 계속 사용할 수 있습니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "초안 생성" })).toBeEnabled();
  });
});
