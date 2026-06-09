import { describe, expect, it } from "vitest";
import type { ReportNarrativeCommand } from "../../model";
import { normalizeReportNarrativeResult, sanitizeReportNarrativeCommand } from "./reportNarrative";

const command: ReportNarrativeCommand = {
  surveyId: "survey-1",
  metadata: {
    title: "생활관 보고서",
    term: "26-1",
    reportDate: "2026-06-05",
    author: "생활관자치회",
    surveyPeriod: "2026.05.01-2026.05.10",
    audience: "생활관 거주 학생",
    method: "온라인 설문",
    purpose: "개선 우선순위 확인",
  },
  filters: { dormitory: "비전관" },
  blocks: [
    {
      id: "priority",
      kind: "priority",
      title: "주요 요약",
      summary: "초기 요약",
      n: 8,
      filters: { dormitory: "비전관" },
      isLowSample: true,
      evidence: [{ id: "priority-1", label: "세탁실 혼잡", source: "priority", n: 8 }],
      body: [
        "name: 김태글 student_id=22000123 email test@example.com response_id=response-1",
        "밤 시간에 세탁기가 부족합니다.",
      ],
    },
  ],
};

describe("reportNarrative validation", () => {
  it("sanitizes sensitive identifiers and bounds representative text", () => {
    const sanitized = sanitizeReportNarrativeCommand(command);

    expect(sanitized.blocks[0]?.body?.[0]).not.toContain("test@example.com");
    expect(sanitized.blocks[0]?.body?.[0]).not.toContain("22000123");
    expect(sanitized.blocks[0]?.body?.[0]).toContain("[비식별]");
  });

  it("normalizes partial model output and filters invalid evidence ids", () => {
    const result = normalizeReportNarrativeResult(
      {
        generatedAt: "2026-06-05T00:00:00.000Z",
        blocks: [
          {
            blockId: "priority",
            summary: "세탁실 혼잡을 먼저 확인해야 합니다.",
            body: [
              "세탁실 혼잡은 현재 필터 조건에서 반복적으로 드러나는 개선 항목입니다.",
              "대표 원문은 대기 시간과 이용 가능 시간대의 불편을 함께 보여줍니다.",
            ],
            evidenceIds: ["priority-1", "unknown"],
            suggestedActions: ["혼잡 시간대 현장 확인"],
          },
          {
            blockId: "unknown-block",
            summary: "무시되어야 합니다.",
            evidenceIds: [],
            suggestedActions: [],
          },
        ],
      },
      command,
    );

    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0]).toMatchObject({
      blockId: "priority",
      evidenceIds: ["priority-1"],
      caution: "응답이 적어 방향성 참고용으로 해석해야 합니다.",
      body: [
        "세탁실 혼잡은 현재 필터 조건에서 반복적으로 드러나는 개선 항목입니다.",
        "대표 원문은 대기 시간과 이용 가능 시간대의 불편을 함께 보여줍니다.",
      ],
      suggestedActions: ["혼잡 시간대 현장 확인"],
    });
  });
});
