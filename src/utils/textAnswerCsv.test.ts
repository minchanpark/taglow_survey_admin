import { describe, expect, it } from "vitest";
import type { TextAnswer } from "../api/admin/model";
import { buildTextAnswersCsvRows } from "./textAnswerCsv";

describe("buildTextAnswersCsvRows", () => {
  it("builds Excel-friendly rows for descriptive answers without profile metadata", () => {
    const rows = buildTextAnswersCsvRows([
      {
        id: "answer-1",
        sectionId: "section-1",
        sectionTitle: "시설",
        questionId: "question-1",
        questionTitle: "세탁실 불만족 이유",
        questionType: "text",
        textValue: "건조기가 부족합니다.",
        valueJson: { choiceValue: "Not enough quantity" },
        createdAt: "2026-05-28T00:00:00",
      },
    ] satisfies TextAnswer[]);

    expect(rows[0]).toEqual([
      "섹션",
      "질문",
      "서술형 응답",
    ]);
    expect(rows[1]).toEqual([
      "시설",
      "세탁실 불만족 이유",
      "건조기가 부족합니다.",
    ]);
  });

  it("excludes basic-info profile answers from the descriptive export rows", () => {
    const rows = buildTextAnswersCsvRows([
      {
        id: "profile-name-answer",
        sectionId: "section-profile",
        sectionTitle: "기본 정보",
        questionId: "question-name",
        questionTitle: "이름",
        questionType: "profile",
        textValue: "김태글",
        valueJson: {},
        createdAt: "2026-05-28T00:00:00",
      },
      {
        id: "profile-dorm-answer",
        sectionId: "section-profile",
        sectionTitle: "기본 정보",
        questionId: "question-dorm",
        questionTitle: "거주 생활관",
        questionType: "text",
        textValue: "비전관",
        valueJson: {},
        createdAt: "2026-05-28T00:00:00",
      },
      {
        id: "text-answer-1",
        sectionId: "section-facility",
        sectionTitle: "시설",
        questionId: "question-facility-opinion",
        questionTitle: "시설 자유 의견",
        questionType: "text",
        textValue: "샤워실 환기가 약합니다.",
        valueJson: {},
        createdAt: "2026-05-28T00:01:00",
      },
    ] satisfies TextAnswer[]);

    expect(rows).toEqual([
      ["섹션", "질문", "서술형 응답"],
      ["시설", "시설 자유 의견", "샤워실 환기가 약합니다."],
    ]);
  });

  it("groups answers by section before writing export rows", () => {
    const rows = buildTextAnswersCsvRows([
      {
        id: "answer-1",
        sectionId: "section-welfare",
        sectionTitle: "복지",
        questionId: "question-welfare",
        questionTitle: "복지 자유 의견",
        questionType: "text",
        textValue: "자판기 선택지가 더 있으면 좋겠습니다.",
        valueJson: {},
        createdAt: "2026-05-28T00:03:00",
      },
      {
        id: "answer-2",
        sectionId: "section-facility",
        sectionTitle: "시설",
        questionId: "question-facility-a",
        questionTitle: "시설 자유 의견",
        questionType: "text",
        textValue: "샤워실 환기가 약합니다.",
        valueJson: {},
        createdAt: "2026-05-28T00:02:00",
      },
      {
        id: "answer-3",
        sectionId: "section-facility",
        sectionTitle: "시설",
        questionId: "question-facility-b",
        questionTitle: "세탁실 불만족 이유",
        questionType: "text",
        textValue: "건조기가 부족합니다.",
        valueJson: {},
        createdAt: "2026-05-28T00:01:00",
      },
    ] satisfies TextAnswer[]);

    expect(rows).toEqual([
      ["섹션", "질문", "서술형 응답"],
      ["복지", "복지 자유 의견", "자판기 선택지가 더 있으면 좋겠습니다."],
      ["시설", "세탁실 불만족 이유", "건조기가 부족합니다."],
      ["시설", "시설 자유 의견", "샤워실 환기가 약합니다."],
    ]);
  });
});
