import { describe, expect, it } from "vitest";
import type { Question } from "./question";
import { getChoiceMatrix, getChoiceOptions, getQuestionKind, shouldShowQuestion } from "./questionInterpretation";

const sourceQuestion: Question = {
  id: "question-source",
  surveyId: "survey-1",
  sectionId: "section-1",
  questionKey: "used_laundry",
  questionType: "single_choice",
  title: { ko: "세탁실을 이용했나요?" },
  orderIndex: 0,
  isRequired: true,
  metricType: "none",
  config: {
    options: [
      { value: "yes", label: { ko: "예", en: "Yes" } },
      { value: "no", labelKo: "아니오" },
    ],
  },
  validation: {},
};

const branchedQuestion: Question = {
  id: "question-followup",
  surveyId: "survey-1",
  sectionId: "section-1",
  questionKey: "laundry_satisfaction",
  questionType: "scale",
  title: { ko: "세탁실 만족도" },
  orderIndex: 1,
  isRequired: true,
  metricType: "satisfaction",
  config: {
    scaleMin: 1,
    scaleMax: 5,
    labelsKo: ["매우 불만", "불만", "보통", "만족", "매우 만족"],
    branch: {
      when: {
        questionKey: "used_laundry",
        operator: "eq",
        value: "yes",
      },
    },
  },
  validation: {},
};

describe("question interpretation", () => {
  it("normalizes mixed option shapes into stable values and localized labels", () => {
    expect(getChoiceOptions(sourceQuestion)).toEqual([
      { value: "yes", labelKo: "예", labelEn: "Yes" },
      { value: "no", labelKo: "아니오" },
    ]);
  });

  it("builds matrix options from configured rows and columns", () => {
    const matrix = getChoiceMatrix({
      matrixRows: [{ value: "05_00_07_00", labelKo: "05:00~07:00" }],
      matrixColumns: [{ value: "mon", labelKo: "월", labelEn: "Mon" }],
      matrixValueSeparator: "_",
    });

    expect(matrix).toEqual({
      rows: [{ value: "05_00_07_00", labelKo: "05:00~07:00" }],
      columns: [{ value: "mon", labelKo: "월", labelEn: "Mon" }],
      valueSeparator: "_",
      options: [{ value: "mon_05_00_07_00", labelKo: "월 - 05:00~07:00", labelEn: "Mon - 05:00~07:00" }],
    });
  });

  it("evaluates branch rules through questionKey to question id mapping", () => {
    const questions = [sourceQuestion, branchedQuestion];

    expect(shouldShowQuestion({ question: branchedQuestion, questions, values: { "question-source": "yes" } })).toBe(true);
    expect(shouldShowQuestion({ question: branchedQuestion, questions, values: { "question-source": "no" } })).toBe(false);
  });

  it("derives renderable text subtypes from config", () => {
    expect(getQuestionKind({ ...sourceQuestion, questionType: "text", config: { textMode: "short" } })).toBe("short_text");
    expect(getQuestionKind({ ...sourceQuestion, questionType: "text", config: { options: ["불편", "개선"] } })).toBe("choice_text");
  });
});
