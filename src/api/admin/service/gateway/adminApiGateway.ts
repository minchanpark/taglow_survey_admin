import type {
  AnalysisQueryArgs,
  RawChoiceDistribution,
  RawGroupCompareResult,
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
  RawImageTagAnswer,
  RawLocusPoint,
  RawQuestion,
  RawQuestionSummary,
  RawPriorityIssue,
  RawResponseSummary,
  RawSection,
  RawSectionSummary,
  RawSurvey,
  RawSurveyAsset,
  RawTextAnswer,
  RawTextGroup,
  RawUpdateAssetPayload,
  RawUpdateQuestionPayload,
  RawUpdateSectionPayload,
  RawUpdateSurveyPayload,
  TextAnswerQueryArgs,
} from "./rawTypes";

export interface AdminApiGateway {
  getCurrentAuthUser(): Promise<RawAdminAuthUser | null>;
  getOwnAdminMember(): Promise<RawAdminMember | null>;
  getCurrentAdmin(): Promise<RawAdminMember | null>;
  requestAdminAccess(): Promise<RawAdminMember>;
  listPendingAdminMembers(): Promise<RawAdminMember[]>;
  listActiveAdminMembers(): Promise<RawAdminMember[]>;
  approveAdminMember(args: { memberId: string; role: "admin" }): Promise<RawAdminMember>;
  updateAdminMemberRole(args: { memberId: string; role: "super_admin" }): Promise<RawAdminMember>;
  deleteAdminMember(args: { memberId: string }): Promise<void>;
  signInWithGoogle(args: { redirectTo: string }): Promise<void>;
  signOut(): Promise<void>;

  listSurveys(): Promise<RawSurvey[]>;
  getSurvey(surveyId: string): Promise<RawSurvey>;
  createSurvey(payload: RawCreateSurveyPayload): Promise<RawSurvey>;
  updateSurvey(args: { surveyId: string; payload: RawUpdateSurveyPayload }): Promise<RawSurvey>;
  archiveSurvey(surveyId: string): Promise<RawSurvey>;
  deleteSurvey(surveyId: string): Promise<void>;
  deleteDraftSurvey(surveyId: string): Promise<void>;

  listSections(surveyId: string): Promise<RawSection[]>;
  createSection(payload: RawCreateSectionPayload): Promise<RawSection>;
  createSections(payloads: RawCreateSectionPayload[]): Promise<RawSection[]>;
  updateSection(args: { sectionId: string; payload: RawUpdateSectionPayload }): Promise<RawSection>;
  deleteSection(sectionId: string): Promise<void>;

  listQuestions(surveyId: string): Promise<RawQuestion[]>;
  createQuestion(payload: RawCreateQuestionPayload): Promise<RawQuestion>;
  createQuestions(payloads: RawCreateQuestionPayload[]): Promise<RawQuestion[]>;
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
  getResponseSummary(args: AnalysisQueryArgs): Promise<RawResponseSummary>;
  getSectionSatisfactionSummary(args: AnalysisQueryArgs): Promise<RawSectionSummary[]>;
  getQuestionSatisfactionSummary(args: AnalysisQueryArgs): Promise<RawQuestionSummary[]>;
  getChoiceDistribution(args: AnalysisQueryArgs): Promise<RawChoiceDistribution[]>;
  getGroupCompareSummary(args: AnalysisQueryArgs): Promise<RawGroupCompareResult[]>;
  getPriorityTop5(args: AnalysisQueryArgs): Promise<RawPriorityIssue[]>;
  getBorichSummary(args: AnalysisQueryArgs): Promise<RawBorichResult[]>;
  getLocusSummary(args: AnalysisQueryArgs): Promise<RawLocusPoint[]>;
  getHeatmapPoints(args: HeatmapQueryArgs): Promise<RawHeatmapPoint[]>;
  listImageTagAnswers(args: HeatmapQueryArgs): Promise<RawImageTagAnswer[]>;
  getTextGroups(args: TextAnswerQueryArgs): Promise<RawTextGroup[]>;
  listTextAnswers(args: TextAnswerQueryArgs): Promise<RawTextAnswer[]>;
}
