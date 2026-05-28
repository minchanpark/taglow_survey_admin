import type {
  AnalysisQueryArgs,
  HeatmapQueryArgs,
  RawAdminAuthUser,
  RawAdminMember,
  RawBorichResult,
  RawCreateAssetPayload,
  RawCreateQuestionPayload,
  RawCreateSectionPayload,
  RawCreateSurveyPayload,
  RawFilterOptions,
  RawHeatmapPoint,
  RawQuestion,
  RawSection,
  RawSectionSummary,
  RawSurvey,
  RawSurveyAsset,
  RawTextAnswer,
  RawUpdateAssetPayload,
  RawUpdateQuestionPayload,
  RawUpdateSectionPayload,
  RawUpdateSurveyPayload,
  TextAnswerQueryArgs,
} from "./rawTypes";

export interface AdminApiGateway {
  getCurrentAuthUser(): Promise<RawAdminAuthUser | null>;
  getCurrentAdmin(): Promise<RawAdminMember | null>;
  signInWithGoogle(args: { redirectTo: string }): Promise<void>;
  signOut(): Promise<void>;

  listSurveys(): Promise<RawSurvey[]>;
  getSurvey(surveyId: string): Promise<RawSurvey>;
  createSurvey(payload: RawCreateSurveyPayload): Promise<RawSurvey>;
  updateSurvey(args: { surveyId: string; payload: RawUpdateSurveyPayload }): Promise<RawSurvey>;
  deleteDraftSurvey(surveyId: string): Promise<void>;

  listSections(surveyId: string): Promise<RawSection[]>;
  createSection(payload: RawCreateSectionPayload): Promise<RawSection>;
  updateSection(args: { sectionId: string; payload: RawUpdateSectionPayload }): Promise<RawSection>;
  deleteSection(sectionId: string): Promise<void>;

  listQuestions(surveyId: string): Promise<RawQuestion[]>;
  createQuestion(payload: RawCreateQuestionPayload): Promise<RawQuestion>;
  updateQuestion(args: { questionId: string; payload: RawUpdateQuestionPayload }): Promise<RawQuestion>;
  deleteQuestion(questionId: string): Promise<void>;

  listAssets(surveyId: string): Promise<RawSurveyAsset[]>;
  createAssetMetadata(payload: RawCreateAssetPayload): Promise<RawSurveyAsset>;
  updateAssetMetadata(args: { assetId: string; payload: RawUpdateAssetPayload }): Promise<RawSurveyAsset>;
  deleteAsset(assetId: string): Promise<void>;

  publishSurvey(surveyId: string): Promise<RawSurvey>;
  closeSurvey(surveyId: string): Promise<RawSurvey>;
  createNextSurveyVersion(surveyId: string): Promise<RawSurvey>;

  getFilterOptions(surveyId: string): Promise<RawFilterOptions>;
  getSectionSatisfactionSummary(args: AnalysisQueryArgs): Promise<RawSectionSummary[]>;
  getBorichSummary(args: AnalysisQueryArgs): Promise<RawBorichResult[]>;
  getHeatmapPoints(args: HeatmapQueryArgs): Promise<RawHeatmapPoint[]>;
  listTextAnswers(args: TextAnswerQueryArgs): Promise<RawTextAnswer[]>;
}
