import { describe, expect, it } from "vitest";
import { getQuestionSetTemplate } from "./dormRegularSurveyQuestionSet";

describe("dormRegularSurveyQuestionSet", () => {
  const template = getQuestionSetTemplate("dorm_regular_25_2");

  it("groups 195 source questions into the planned 8 sections", () => {
    expect(template.sections).toHaveLength(8);
    expect(template.sections.map((section) => [section.title.ko, section.questions.length])).toEqual([
      ["기본 정보", 6],
      ["자치회 사업", 26],
      ["입출입 및 점호 시스템", 26],
      ["생활관 시설", 100],
      ["세탁 및 건조기", 14],
      ["기타 생활", 14],
      ["글로벌 라운지", 7],
      ["제출자 정보", 2],
    ]);
    expect(template.sections.flatMap((section) => section.questions)).toHaveLength(195);
  });

  it("infers representative question types and metrics", () => {
    const questions = new Map(template.sections.flatMap((section) => section.questions.map((question) => [question.sourceNumber, question])));

    expect(questions.get(1)?.questionType).toBe("profile");
    expect(questions.get(7)?.questionType).toBe("scale");
    expect(questions.get(31)?.questionType).toBe("text");
    expect(questions.get(51)?.questionType).toBe("attention_check");
    expect(questions.get(163)?.questionType).toBe("multi_select");
    expect(questions.get(172)?.questionType).toBe("single_choice");
    expect(questions.get(173)?.metricType).toBe("importance");
  });
});
