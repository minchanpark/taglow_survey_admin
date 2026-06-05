import { describe, expect, it } from "vitest";
import { departmentOptions, dormitoryOptions, genderOptions, rcOptions, roomTypeOptions, semesterGroupOptions } from "../../model";
import { getQuestionSetTemplate } from "./handongDomSurveyQuestionSet";

describe("handongDomSurveyQuestionSet", () => {
  const template = getQuestionSetTemplate("handong-dom-survey-2026-1");

  it("groups the Handong dorm survey questions into the planned sections", () => {
    expect(template.sections).toHaveLength(7);
    expect(template.sections.map((section) => [section.title.ko, section.questions.length])).toEqual([
      ["기본 정보", 8],
      ["자치회 사업", 17],
      ["입출입 및 점호 시스템", 26],
      ["생활관 시설", 112],
      ["세탁 및 건조기", 6],
      ["기타 생활", 14],
      ["글로벌 라운지", 8],
    ]);
    expect(template.sections.flatMap((section) => section.questions)).toHaveLength(191);
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
    expect(questions.get(8)?.title.en).toBe("Office Hours (Post Approval)");
    expect(questions.get(16)?.title.en).toBe("Food Truck Discount Coupon Event");
    expect(questions.get(22)?.questionType).toBe("text");
    expect(questions.get(22)?.title.en).toBe("If there are any areas for improvement regarding the 'Dorm Union initiatives', please feel free to share.");
    expect(questions.get(24)?.title.ko).toBe("침묵시간 운영시간");
    expect(questions.get(24)?.title.en).toBe("Silent Hours Operating Hours");
    expect(questions.get(25)?.title.ko).toBe("침묵시간 규칙 준수");
    expect(questions.get(25)?.title.en).toBe("Compliance with Silent Hours Rules");
    expect(questions.get(26)?.title.ko).toBe("침묵시간 관리 방법");
    expect(questions.get(26)?.title.en).toBe("Management of Silent Hours");
    expect(questions.get(27)?.title.ko).toBe("침묵시간 효과성");
    expect(questions.get(27)?.title.en).toBe("Effectiveness of Silent Hours");
    expect(questions.get(24)?.displayGroup).toBe("'침묵시간'과 관련된 다음 항목에 대한 만족도에 대해 어떻게 생각하십니까?");
    expect(questions.get(24)?.displayGroupEn).toBe("What is your level of satisfaction with the following aspects related to 'Silent Hours'?");
    expect(questions.get(42)?.questionType).toBe("attention_check");
    expect(questions.get(42)?.config).toMatchObject({
      scaleMin: 1,
      scaleMax: 7,
      labelsKo: ["참여경험없음", "매우 불만족", "불만족", "보통", "만족", "매우 만족", "들어본 적 없음"],
      labelsEn: ["No participation experience", "Very dissatisfied", "Dissatisfied", "Neutral", "Satisfied", "Very satisfied", "Never heard of it"],
      expectedValue: "5",
      excludeIfFailed: true,
    });
    expect(questions.get(42)?.title.en).toBe("Please select 'Satisfied'.");
    expect(questions.get(172)?.questionType).toBe("attention_check");
    expect(questions.get(172)?.config).toMatchObject({
      labelsEn: ["Not important at all", "Not important", "Neutral", "Important", "Very important"],
      expectedValue: "5",
      excludeIfFailed: true,
    });
    expect(questions.get(154)?.questionType).toBe("matrix_multi_select");
    const config154 = questions.get(154)?.config as any;
    expect(config154.minSelect).toBe(0);
    expect(config154.matrixRows).toHaveLength(9);
    expect(config154.matrixColumns).toHaveLength(7);
    expect(config154.matrixRows[0]).toEqual({ value: "05_00_07_00", labelKo: "05:00~07:00", labelEn: "05:00~07:00" });
    expect(config154.matrixColumns[0]).toEqual({ value: "mon", labelKo: "월", labelEn: "Mon" });
    expect(config154.options).toHaveLength(63);
    expect(config154.options?.[0]).toEqual({
      value: "mon_05_00_07_00",
      labelKo: "월 - 05:00~07:00",
      labelEn: "Mon - 05:00~07:00",
    });
    expect(config154.options?.at(-1)).toEqual({
      value: "sun_21_00_23_00",
      labelKo: "일 - 21:00~23:00",
      labelEn: "Sun - 21:00~23:00",
    });
    expect(questions.get(163)?.questionType).toBe("single_choice");
    expect(questions.get(163)?.config).toMatchObject({ options: expect.arrayContaining([{ value: "05_00_07_00", labelKo: "05:00~07:00" }]) });
    expect(questions.get(164)?.metricType).toBe("importance");
    expect(questions.get(150)?.displayGroupEn).toBe("Is the management of the washing machines and dryers being carried out effectively?");
    expect(questions.get(150)?.config).toMatchObject({
      scaleMin: 1,
      scaleMax: 7,
      labelsKo: ["참여경험없음", "매우 불만족", "불만족", "보통", "만족", "매우 만족", "들어본 적 없음"],
      excludedValues: [1, 7],
    });
    expect(questions.get(185)?.questionType).toBe("profile");
    expect(questions.get(185)?.title.en).toBe("Student ID (e.g., 22400001)");
    expect(questions.get(185)?.config).toMatchObject({ profileField: "student_number", inputType: "text" });
    expect(questions.get(186)?.questionType).toBe("profile");
    expect(questions.get(186)?.title.en).toBe("Name (e.g., Kim Handong)");
    expect(questions.get(186)?.config).toMatchObject({ profileField: "name", inputType: "text" });
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
