import { describe, expect, it } from "vitest";
import { departmentOptions, dormitoryOptions, genderOptions, rcOptions, roomTypeOptions, semesterGroupOptions } from "../../model";
import { getQuestionSetTemplate } from "./handongDomSurveyQuestionSet";

describe("handongDomSurveyQuestionSet", () => {
  const template = getQuestionSetTemplate("handong-dom-survey-2026-1");

  it("groups the Handong dorm survey questions into the planned sections", () => {
    expect(template.sections).toHaveLength(7);
    expect(template.sections.map((section) => [section.title.ko, section.questions.length])).toEqual([
      ["기본 정보", 7],
      ["자치회 사업", 26],
      ["입출입 및 점호 시스템", 26],
      ["생활관 시설", 112],
      ["세탁 및 건조기", 14],
      ["기타 생활", 14],
      ["글로벌 라운지", 8],
    ]);
    expect(template.sections.flatMap((section) => section.questions)).toHaveLength(207);
  });

  it("infers representative question types and metrics", () => {
    const questions = new Map(template.sections.flatMap((section) => section.questions.map((question) => [question.sourceNumber, question])));

    expect(questions.get(1)?.questionType).toBe("profile");
    expect(questions.get(1)?.title.en).toBe("Gender");
    expect(questions.get(7)?.questionType).toBe("scale");
    expect(questions.get(7)?.title.ko).toBe("입주 업무 (택배 관리 및 정리, 차량 통제, 끌차 대여)");
    expect(questions.get(7)?.title.en).toBe("Move-in Services (Package Management and Organization, Vehicle Control, Cart Rental)");
    expect(questions.get(7)?.displayGroup).toBe("다음 자치회 사업에 대한 만족도는 어떠합니까? (학생 복지 부문)");
    expect(questions.get(7)?.displayGroupEn).toBe("What is your level of satisfaction with the following Dorm Union events? (Student Welfare Section)");
    expect(questions.get(7)?.config).toMatchObject({
      displayGroupEn: "What is your level of satisfaction with the following Dorm Union events? (Student Welfare Section)",
    });
    expect(questions.get(31)?.questionType).toBe("text");
    expect(questions.get(31)?.title.en).toBe("If there are any areas for improvement regarding the 'Dorm Union initiatives', please feel free to share.");
    expect(questions.get(33)?.title.ko).toBe("침묵시간 운영시간");
    expect(questions.get(33)?.title.en).toBe("Silent Hours Operating Hours");
    expect(questions.get(34)?.title.ko).toBe("침묵시간 규칙 준수");
    expect(questions.get(34)?.title.en).toBe("Compliance with Silent Hours Rules");
    expect(questions.get(35)?.title.ko).toBe("침묵시간 관리 방법");
    expect(questions.get(35)?.title.en).toBe("Management of Silent Hours");
    expect(questions.get(36)?.title.ko).toBe("침묵시간 효과성");
    expect(questions.get(36)?.title.en).toBe("Effectiveness of Silent Hours");
    expect(questions.get(33)?.displayGroup).toBe("'침묵시간'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까?");
    expect(questions.get(33)?.displayGroupEn).toBe("What is your level of satisfaction with the following aspects related to 'Silent Hours'?");
    expect(questions.get(51)?.questionType).toBe("attention_check");
    expect(questions.get(51)?.config).toMatchObject({
      scaleMin: 1,
      scaleMax: 5,
      labelsEn: ["Very dissatisfied", "Dissatisfied", "Neutral", "Satisfied", "Very satisfied"],
      expectedValue: "4",
      excludeIfFailed: true,
    });
    expect(questions.get(51)?.title.en).toBe("Please select 'Satisfied'.");
    expect(questions.get(181)?.questionType).toBe("attention_check");
    expect(questions.get(181)?.config).toMatchObject({
      labelsEn: ["Not important at all", "Not important", "Neutral", "Important", "Very important"],
      expectedValue: "5",
      excludeIfFailed: true,
    });
    expect(questions.get(163)?.questionType).toBe("multi_select");
    expect(questions.get(172)?.questionType).toBe("single_choice");
    expect(questions.get(173)?.metricType).toBe("importance");
    expect(questions.get(159)?.displayGroupEn).toBe("Is the management of the washing machines and dryers being carried out effectively?");
    expect(questions.get(195)?.questionType).toBe("participant_image_tag");
    expect(questions.get(195)?.title.en).toBe("If you have any suggestions or inquiries regarding the bathroom, please upload an image and tag the relevant area.");
    expect(questions.get(207)?.title.ko).toBe("글로벌 라운지와 관련하여 건의/문의하고 싶은 내용이 있다면, 이미지를 올려서 태깅해주세요.");
  });

  it("uses canonical profile options with stored Korean values", () => {
    const questions = new Map(template.sections.flatMap((section) => section.questions.map((question) => [question.sourceNumber, question])));

    expect(questions.get(1)?.config).toMatchObject({
      profileField: "gender",
      inputType: "single_choice",
      options: genderOptions.map((value) => ({ value, labelKo: value, labelEn: value === "남성" ? "Male" : "Female" })),
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

  it("provides English section and question text for the full template", () => {
    expect(template.sections.map((section) => section.title.en)).toEqual([
      "Basic Information",
      "Dorm Union Initiatives",
      "Entry, Exit, and Roll Call System",
      "Dormitory Facilities",
      "Washing Machines and Dryers",
      "Other Living Conditions",
      "Handong Global Lounge",
    ]);
    expect(template.sections.flatMap((section) => section.questions).filter((question) => !question.title.en)).toHaveLength(0);
    expect(
      template.sections
        .flatMap((section) => section.questions)
        .filter((question) => question.displayGroup && !question.displayGroupEn),
    ).toHaveLength(0);
    expect(
      template.sections
        .flatMap((section) => section.questions)
        .filter((question) => question.displayGroupEn && /[가-힣]/.test(question.displayGroupEn)),
    ).toHaveLength(0);
  });
});
