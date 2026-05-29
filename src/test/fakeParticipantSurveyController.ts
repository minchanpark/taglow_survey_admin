import type { ParticipantSurveyController, ParticipantSurveyDetail } from "../api/participant";

export const fakeParticipantSurveyDetail: ParticipantSurveyDetail = {
  survey: {
    id: "survey-1",
    title: "생활관 만족도 조사",
    description: "2026 봄학기",
    publicSlug: "handong-dorm-2026",
    publicCode: "8K2PQA",
    publicIdentifier: "handong-dorm-2026",
    versionNumber: 1,
    settings: {},
    publishedAt: "2026-05-28T00:00:00.000Z",
  },
  sections: [
    {
      id: "section-1",
      surveyId: "survey-1",
      sectionKey: "facility",
      title: { ko: "생활관 시설" },
      orderIndex: 0,
      sectionType: "facility",
      settings: {},
    },
  ],
  questions: [
    {
      id: "question-1",
      surveyId: "survey-1",
      sectionId: "section-1",
      questionKey: "bed_satisfaction",
      questionType: "scale",
      title: { ko: "침대 만족도는 어떤가요?" },
      orderIndex: 0,
      isRequired: true,
      metricType: "satisfaction",
      config: {},
      validation: {},
    },
  ],
  assets: [],
};

export function createFakeParticipantSurveyController(
  overrides: Partial<ParticipantSurveyController> = {},
): ParticipantSurveyController {
  return {
    getParticipantSessionState: async () => ({
      isAuthenticated: true,
      email: "participant@example.com",
    }),
    signInWithGoogle: async () => undefined,
    getPublishedSurveyByIdentifier: async () => fakeParticipantSurveyDetail,
    uploadQuestionImage: async (command) => ({
      storageBucket: "survey-assets",
      storagePath: `participant-uploads/${command.surveyId}/user-1/${command.questionId}/image.png`,
      signedUrl: "https://example.com/uploaded.png",
      metadata: {},
    }),
    ...overrides,
  };
}
