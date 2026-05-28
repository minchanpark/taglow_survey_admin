import type {
  AdminApiController,
} from "../api/admin/controller";
import type {
  AdminMember,
  AdminSessionState,
  BorichResult,
  CreateQuestionCommand,
  CreateSectionCommand,
  CreateSurveyCommand,
  FilterOptions,
  HeatmapPoint,
  PreviewSurvey,
  PreviewSurveyCommand,
  PublishValidationResult,
  Question,
  SectionSummary,
  Survey,
  SurveyAsset,
  SurveyDetail,
  SurveySection,
  TextAnswer,
  UpdateQuestionCommand,
  UpdateSectionCommand,
  UpdateSurveyCommand,
} from "../api/admin/model";

export const fakeAdminMember: AdminMember = {
  id: "admin-member-1",
  userId: "user-1",
  email: "admin@handong.ac.kr",
  role: "owner",
  isActive: true,
  createdAt: "2026-05-28T00:00:00.000Z",
};

export const activeAdminSession: AdminSessionState = {
  isAuthenticated: true,
  email: fakeAdminMember.email,
  isHandongEmail: true,
  admin: fakeAdminMember,
};

export const unauthenticatedSession: AdminSessionState = {
  isAuthenticated: false,
  isHandongEmail: false,
};

export const nonMemberSession: AdminSessionState = {
  isAuthenticated: true,
  email: "student@handong.ac.kr",
  isHandongEmail: true,
};

export const fakeSurvey: Survey = {
  id: "survey-1",
  title: "생활관 만족도 조사",
  description: "2026 봄학기",
  status: "draft",
  publicSlug: undefined,
  versionGroupId: "version-group-1",
  versionNumber: 1,
  parentSurveyId: undefined,
  isLatestVersion: true,
  settings: {},
  createdBy: "user-1",
  publishedAt: undefined,
  closedAt: undefined,
  createdAt: "2026-05-28T00:00:00.000Z",
  updatedAt: "2026-05-28T00:00:00.000Z",
};

const emptyFilterOptions: FilterOptions = {
  genders: [],
  semesterGroups: [],
  departments: [],
  rcs: [],
  dormitories: [],
  roomTypes: [],
  dormExperiences: [],
};

export function createFakeAdminApiController(overrides: Partial<AdminApiController> = {}): AdminApiController {
  const controller: AdminApiController = {
    getAdminSessionState: async () => activeAdminSession,
    getCurrentAdmin: async () => fakeAdminMember,
    signInWithGoogle: async () => undefined,
    signOut: async () => undefined,
    listSurveys: async () => [],
    getSurveyDetail: async (surveyId: string): Promise<SurveyDetail> => ({
      survey: { ...fakeSurvey, id: surveyId },
      sections: [],
      questions: [],
      assets: [],
    }),
    createSurvey: async (command: CreateSurveyCommand) => ({ ...fakeSurvey, title: command.title }),
    updateSurvey: async (command: UpdateSurveyCommand) => ({ ...fakeSurvey, id: command.surveyId, title: command.title ?? fakeSurvey.title }),
    deleteDraftSurvey: async () => undefined,
    createSection: async (command: CreateSectionCommand): Promise<SurveySection> => ({
      id: "section-1",
      surveyId: command.surveyId,
      sectionKey: command.sectionKey,
      title: command.title,
      description: command.description,
      orderIndex: command.orderIndex,
      sectionType: command.sectionType ?? "general",
      settings: command.settings ?? {},
    }),
    updateSection: async (command: UpdateSectionCommand): Promise<SurveySection> => ({
      id: command.sectionId,
      surveyId: "survey-1",
      sectionKey: "section",
      title: command.title ?? { ko: "섹션" },
      description: command.description,
      orderIndex: command.orderIndex ?? 0,
      sectionType: command.sectionType ?? "general",
      settings: command.settings ?? {},
    }),
    reorderSections: async () => [],
    deleteSection: async () => undefined,
    createQuestion: async (command: CreateQuestionCommand): Promise<Question> => ({
      id: "question-1",
      surveyId: command.surveyId,
      sectionId: command.sectionId,
      questionKey: command.questionKey,
      questionType: command.questionType,
      title: command.title,
      description: command.description,
      orderIndex: command.orderIndex,
      isRequired: command.isRequired ?? true,
      metricType: command.metricType ?? "none",
      topicKey: command.topicKey,
      spaceKey: command.spaceKey,
      config: command.config ?? {},
      validation: command.validation ?? {},
    }),
    updateQuestion: async (command: UpdateQuestionCommand): Promise<Question> => ({
      id: command.questionId,
      surveyId: "survey-1",
      sectionId: "section-1",
      questionKey: "question",
      questionType: "text",
      title: command.title ?? { ko: "질문" },
      description: command.description,
      orderIndex: command.orderIndex ?? 0,
      isRequired: command.isRequired ?? true,
      metricType: command.metricType ?? "none",
      topicKey: command.topicKey,
      spaceKey: command.spaceKey,
      config: command.config ?? {},
      validation: command.validation ?? {},
    }),
    reorderQuestions: async () => [],
    deleteQuestion: async () => undefined,
    uploadSurveyImage: async (): Promise<SurveyAsset> => ({
      id: "asset-1",
      surveyId: "survey-1",
      assetType: "image",
      storageBucket: "survey-assets",
      storagePath: "survey-1/image.png",
      metadata: {},
      createdAt: "2026-05-28T00:00:00.000Z",
    }),
    validateBeforePublish: async (): Promise<PublishValidationResult> => ({ canPublish: true, issues: [] }),
    publishSurvey: async () => ({ ...fakeSurvey, status: "published" }),
    closeSurvey: async () => ({ ...fakeSurvey, status: "closed" }),
    createNextVersion: async () => ({ ...fakeSurvey, id: "survey-2", versionNumber: 2 }),
    getPreviewSurvey: async (command: PreviewSurveyCommand): Promise<PreviewSurvey> => ({
      survey: { ...fakeSurvey, id: command.surveyId },
      sections: [],
      questions: [],
      assets: [],
      previewMode: true,
      options: command.options,
    }),
    getFilterOptions: async () => emptyFilterOptions,
    getSectionSatisfactionSummary: async (): Promise<SectionSummary[]> => [],
    getBorichSummary: async (): Promise<BorichResult[]> => [],
    getHeatmapPoints: async (): Promise<HeatmapPoint[]> => [],
    listTextAnswers: async (): Promise<TextAnswer[]> => [],
  };

  return { ...controller, ...overrides };
}
