import { describe, expect, it } from "vitest";
import type { Question } from "./question";
import {
  buildFilterOptionsFromQuestions,
  buildProfileFilterDefinitions,
  pruneAnalysisFilters,
} from "./profileOptions";

const profileQuestions: Question[] = [
  {
    id: "question-gender",
    surveyId: "survey-1",
    sectionId: "section-profile",
    questionKey: "profile_gender",
    questionType: "profile",
    title: { ko: "성별" },
    orderIndex: 0,
    isRequired: true,
    metricType: "none",
    config: {
      profileField: "gender",
      inputType: "single_choice",
      options: [
        { value: "male", labelKo: "남성" },
        { value: "female", labelKo: "여성" },
      ],
    },
    validation: {},
  },
  {
    id: "question-room",
    surveyId: "survey-1",
    sectionId: "section-profile",
    questionKey: "profile_room",
    questionType: "profile",
    title: { ko: "방 타입" },
    orderIndex: 1,
    isRequired: true,
    metricType: "none",
    config: {
      profileField: "room_type",
      inputType: "single_choice",
      options: [
        { value: "single", labelKo: "1인실" },
        { value: "double", labelKo: "2인실" },
      ],
    },
    validation: {},
  },
  {
    id: "question-name",
    surveyId: "survey-1",
    sectionId: "section-profile",
    questionKey: "profile_name",
    questionType: "profile",
    title: { ko: "이름" },
    orderIndex: 2,
    isRequired: false,
    metricType: "none",
    config: {
      profileField: "name",
      inputType: "text",
      options: [],
    },
    validation: {},
  },
];

describe("profile filter definitions", () => {
  it("derives filter labels and stored option values from profile questions", () => {
    expect(buildProfileFilterDefinitions(profileQuestions)).toEqual([
      {
        key: "gender",
        profileField: "gender",
        label: "성별",
        options: [
          { value: "male", label: "남성" },
          { value: "female", label: "여성" },
        ],
        questionId: "question-gender",
        questionKey: "profile_gender",
        orderIndex: 0,
      },
      {
        key: "roomType",
        profileField: "room_type",
        label: "방 타입",
        options: [
          { value: "single", label: "1인실" },
          { value: "double", label: "2인실" },
        ],
        questionId: "question-room",
        questionKey: "profile_room",
        orderIndex: 1,
      },
    ]);
  });

  it("builds legacy filter option arrays from the same question config", () => {
    expect(buildFilterOptionsFromQuestions(profileQuestions)).toMatchObject({
      genders: ["male", "female"],
      roomTypes: ["single", "double"],
      dormitories: [],
    });
  });

  it("drops active filters that no longer exist in the builder config", () => {
    expect(
      pruneAnalysisFilters(
        {
          gender: "other",
          roomType: "double",
          department: "AI융합학부",
          sectionId: "section-1",
        },
        buildProfileFilterDefinitions(profileQuestions),
      ),
    ).toEqual({
      roomType: "double",
      sectionId: "section-1",
    });
  });
});
