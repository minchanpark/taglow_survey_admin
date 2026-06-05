import { describe, expect, it } from "vitest";
import type { ReportMetadata, ReportSourceData } from "../../../api/admin/model";
import { buildReportDraft, exportReportMarkdown } from "./reportDraft";

const metadata: ReportMetadata = {
  title: "생활관 만족도 보고서",
  term: "26-1",
  reportDate: "2026-06-04",
  author: "생활관자치회",
  surveyPeriod: "2026.05.01-2026.05.10",
  audience: "생활관 거주 학생",
  method: "온라인 설문",
  purpose: "개선 우선순위 확인",
};

const includedSections = {
  overview: true,
  response_profile: true,
  priority: true,
  section_summary: true,
  question_summary: true,
  choice_distribution: true,
  text_evidence: true,
  recommendation: true,
  appendix: true,
};

const source: ReportSourceData = {
  responseSummary: {
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
      dormitory: [{ key: "비전관", label: "비전관", n: 5, percentage: 62.5 }],
      roomType: [],
      dormExperience: [],
    },
    lowSampleGroups: [],
  },
  profileDistribution: {
    gender: [],
    semesterGroup: [],
    department: [],
    rc: [],
    dormitory: [{ key: "비전관", label: "비전관", n: 5, percentage: 62.5 }],
    roomType: [],
    dormExperience: [],
  },
  priorities: [
    {
      id: "priority-1",
      label: "세탁실 혼잡",
      source: "low_satisfaction",
      averageImportance: null,
      averageSatisfaction: 2.1,
      gap: null,
      borichScore: null,
      textCount: 3,
      tagCount: 1,
      n: 8,
    },
  ],
  sectionSummaries: [{ sectionId: "section-1", sectionTitle: "시설", averageScore: 2.5, n: 8 }],
  questionSummaries: [
    {
      questionId: "question-1",
      questionTitle: "세탁실 만족도",
      averageScore: 2.1,
      standardDeviation: 0.8,
      n: 8,
      metricType: "satisfaction",
    },
  ],
  choiceDistributions: [{ questionId: "choice-1", questionTitle: "주 이용 시간", optionValue: "night", optionLabel: "밤", count: 6, n: 8, percentage: 75 }],
  textGroups: [{ groupKey: "text-1", label: "세탁 대기", count: 3, n: 8, representativeTexts: ["밤 시간에 세탁기가 부족합니다."] }],
  textAnswers: [{ id: "answer-1", textValue: "밤 시간에 세탁기가 부족합니다.", valueJson: {}, createdAt: "2026-06-04T00:00:00.000Z" }],
};

describe("reportDraft", () => {
  it("builds the default report order with low-N metadata", () => {
    const draft = buildReportDraft({
      surveyId: "survey-1",
      metadata,
      filters: { dormitory: "비전관" },
      source,
      includedSections,
      generatedAt: "2026-06-04T00:00:00.000Z",
    });

    expect(draft.blocks.map((block) => block.title)).toEqual([
      "조사 개괄",
      "응답자 현황",
      "주요 요약",
      "영역별 분석",
      "문항별 분석",
      "선택형 응답 분포",
      "주관식 상세",
      "종합 평가 및 제언",
      "근거 데이터",
    ]);
    expect(draft.blocks[0]).toMatchObject({ n: 8, isLowSample: true });
  });

  it("exports markdown with filters, evidence, and low-N caution", () => {
    const draft = buildReportDraft({
      surveyId: "survey-1",
      metadata,
      filters: { dormitory: "비전관" },
      source,
      includedSections: { ...includedSections, appendix: false },
      editedSummaries: { priority: "편집된 요약입니다." },
      narrativeBlocks: {
        priority: {
          blockId: "priority",
          summary: "AI가 정리한 우선순위 요약입니다.",
          body: ["AI가 확장한 보고서 본문입니다.", "세탁실 혼잡은 응답 수와 대표 의견을 함께 보아야 합니다."],
          evidenceIds: ["priority-1"],
          caution: "N이 낮아 방향성 참고용으로만 해석합니다.",
          suggestedActions: ["세탁실 혼잡 시간대 현장 확인"],
        },
      },
      generatedAt: "2026-06-04T00:00:00.000Z",
    });
    const markdown = exportReportMarkdown(draft);

    expect(markdown).toContain("# 생활관 만족도 보고서");
    expect(markdown).toContain("생활관: 비전관");
    expect(markdown).toContain("해석 주의");
    expect(markdown).toContain("편집된 요약입니다.");
    expect(markdown).toContain("AI가 확장한 보고서 본문입니다.");
    expect(markdown).toContain("근거:");
    expect(markdown).toContain("AI 주의 문구: N이 낮아 방향성 참고용으로만 해석합니다.");
    expect(markdown).toContain("제안 조치:");
    expect(markdown).toContain("세탁실 혼잡 시간대 현장 확인");
  });
});
