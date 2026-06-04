import { describe, expect, it } from "vitest";
import type { Question } from "../../../api/admin/model";
import { buildSubmitSurveyResponseCommand } from "./participantSubmission";

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
      profileField: "Gender",
      inputType: "single_choice",
      options: [{ value: "여성", labelKo: "여성" }],
    },
    validation: {},
  },
  {
    id: "question-room-type",
    surveyId: "survey-1",
    sectionId: "section-profile",
    questionKey: "profile_room_type",
    questionType: "profile",
    title: { ko: "인실" },
    orderIndex: 1,
    isRequired: true,
    metricType: "none",
    config: {
      profileField: "Room_type",
      inputType: "single_choice",
      options: [{ value: "2인실", labelKo: "2인실" }],
    },
    validation: {},
  },
];

describe("buildSubmitSurveyResponseCommand", () => {
  it("normalizes imported profile field casing before submitting profile filters", () => {
    const command = buildSubmitSurveyResponseCommand({
      surveyId: "survey-1",
      clientSubmissionId: "submission-1",
      startedAt: "2026-06-04T00:00:00.000Z",
      questions: profileQuestions,
      answers: {
        "question-gender": "여성",
        "question-room-type": "2인실",
      },
    });

    expect(command.profile).toEqual({
      gender: "여성",
      room_type: "2인실",
    });
    expect(command.rawPayload.profile).toEqual(command.profile);
  });
});
