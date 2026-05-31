import { describe, expect, it } from "vitest";
import { departmentOptions, dormitoryOptions, genderOptions, rcOptions, roomTypeOptions, semesterGroupOptions } from "../../model";
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
    expect(questions.get(7)?.title.ko).toBe("입주 업무 (택배 관리 및 정리, 차량 통제, 끌차 대여)");
    expect(questions.get(7)?.displayGroup).toBe("다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 복지 부문)");
    expect(questions.get(31)?.questionType).toBe("text");
    expect(questions.get(51)?.questionType).toBe("attention_check");
    expect(questions.get(51)?.config).toMatchObject({
      scaleMin: 1,
      scaleMax: 5,
      expectedValue: "4",
      excludeIfFailed: true,
    });
    expect(questions.get(181)?.questionType).toBe("attention_check");
    expect(questions.get(181)?.config).toMatchObject({
      expectedValue: "5",
      excludeIfFailed: true,
    });
    expect(questions.get(163)?.questionType).toBe("multi_select");
    expect(questions.get(172)?.questionType).toBe("single_choice");
    expect(questions.get(173)?.metricType).toBe("importance");
  });

  it("uses canonical profile options with stored Korean values", () => {
    const questions = new Map(template.sections.flatMap((section) => section.questions.map((question) => [question.sourceNumber, question])));

    expect(questions.get(1)?.config).toMatchObject({
      profileField: "gender",
      inputType: "single_choice",
      options: genderOptions.map((value) => ({ value, labelKo: value })),
    });
    expect(questions.get(2)?.config).toMatchObject({
      profileField: "semester_group",
      inputType: "single_choice",
      options: semesterGroupOptions.map((value) => ({ value, labelKo: value })),
    });
    expect(questions.get(3)?.config).toMatchObject({
      profileField: "department",
      options: departmentOptions.map((value) => ({ value, labelKo: value })),
    });
    expect(questions.get(4)?.config).toMatchObject({
      profileField: "rc",
      options: rcOptions.map((value) => ({ value, labelKo: value })),
    });
    expect(questions.get(5)?.config).toMatchObject({
      profileField: "room_type",
      options: roomTypeOptions.map((value) => ({ value, labelKo: value })),
    });
    expect(questions.get(6)?.config).toMatchObject({
      profileField: "dormitory",
      options: dormitoryOptions.map((value) => ({ value, labelKo: value })),
    });
    expect(JSON.stringify(questions.get(1)?.config)).not.toContain("기타");
    expect(JSON.stringify(questions.get(5)?.config)).not.toContain("기타");
  });
});
