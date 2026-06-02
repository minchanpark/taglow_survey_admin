import type {
  AdminMember,
  AdminSessionState,
  AdminSignInCommand,
  AnalysisFilterCommand,
  ApproveAdminMemberCommand,
  BorichResult,
  ChoiceDistribution,
  CreateQuestionCommand,
  CreateSectionCommand,
  CreateSurveyCommand,
  DeleteAdminMemberCommand,
  FilterOptions,
  GroupCompareFilterCommand,
  GroupCompareResult,
  HeatmapFilterCommand,
  HeatmapPoint,
  ImageTagAnswer,
  ImageTagAnswerFilterCommand,
  IdentityResponse,
  IdentityResponseFilterCommand,
  InviteSurveyCollaboratorCommand,
  LocusPoint,
  PaginatedResult,
  PreviewSurvey,
  PreviewSurveyCommand,
  PriorityIssue,
  QuestionSetImportCommand,
  QuestionSetImportPreview,
  QuestionSetImportPreviewCommand,
  QuestionSetImportResult,
  PublishValidationResult,
  Question,
  QuestionSummary,
  ReorderQuestionsCommand,
  ReorderSectionsCommand,
  RevokeSurveyCollaboratorCommand,
  ResponseSummary,
  SectionSummary,
  Survey,
  SurveyAsset,
  SurveyCollaborator,
  SurveyDetail,
  SurveySection,
  TextAnswer,
  TextAnswerFilterCommand,
  TextGroup,
  UpdateAdminMemberRoleCommand,
  UpdateQuestionCommand,
  UpdateSectionCommand,
  UpdateSurveyCollaboratorRoleCommand,
  UpdateSurveyCommand,
  UploadSurveyImageCommand,
} from "../model";

export interface AdminApiController {
  getAdminSessionState(): Promise<AdminSessionState>;
  getCurrentAdmin(): Promise<AdminMember | null>;
  requestAdminAccess(): Promise<AdminMember>;
  listPendingAdminMembers(): Promise<AdminMember[]>;
  listActiveAdminMembers(): Promise<AdminMember[]>;
  approveAdminMember(command: ApproveAdminMemberCommand): Promise<AdminMember>;
  updateAdminMemberRole(command: UpdateAdminMemberRoleCommand): Promise<AdminMember>;
  deleteAdminMember(command: DeleteAdminMemberCommand): Promise<void>;
  signInWithGoogle(command: AdminSignInCommand): Promise<void>;
  signOut(): Promise<void>;

  listSurveys(): Promise<Survey[]>;
  getSurveyDetail(surveyId: string): Promise<SurveyDetail>;
  createSurvey(command: CreateSurveyCommand): Promise<Survey>;
  updateSurvey(command: UpdateSurveyCommand): Promise<Survey>;
  archiveSurvey(surveyId: string): Promise<Survey>;
  deleteSurvey(surveyId: string): Promise<void>;
  deleteDraftSurvey(surveyId: string): Promise<void>;
  listSurveyCollaborators(surveyId: string): Promise<SurveyCollaborator[]>;
  inviteSurveyCollaborator(command: InviteSurveyCollaboratorCommand): Promise<SurveyCollaborator>;
  updateSurveyCollaboratorRole(command: UpdateSurveyCollaboratorRoleCommand): Promise<SurveyCollaborator>;
  revokeSurveyCollaborator(command: RevokeSurveyCollaboratorCommand): Promise<SurveyCollaborator>;

  createSection(command: CreateSectionCommand): Promise<SurveySection>;
  updateSection(command: UpdateSectionCommand): Promise<SurveySection>;
  reorderSections(command: ReorderSectionsCommand): Promise<SurveySection[]>;
  deleteSection(sectionId: string): Promise<void>;

  createQuestion(command: CreateQuestionCommand): Promise<Question>;
  updateQuestion(command: UpdateQuestionCommand): Promise<Question>;
  reorderQuestions(command: ReorderQuestionsCommand): Promise<Question[]>;
  deleteQuestion(questionId: string): Promise<void>;

  uploadSurveyImage(command: UploadSurveyImageCommand): Promise<SurveyAsset>;

  validateBeforePublish(surveyId: string): Promise<PublishValidationResult>;
  publishSurvey(surveyId: string): Promise<Survey>;
  closeSurvey(surveyId: string): Promise<Survey>;
  createNextVersion(surveyId: string): Promise<Survey>;

  getPreviewSurvey(command: PreviewSurveyCommand): Promise<PreviewSurvey>;

  previewQuestionSetImport(command: QuestionSetImportPreviewCommand): Promise<QuestionSetImportPreview>;
  importQuestionSet(command: QuestionSetImportCommand): Promise<QuestionSetImportResult>;

  getFilterOptions(surveyId: string): Promise<FilterOptions>;
  getResponseSummary(command: AnalysisFilterCommand): Promise<ResponseSummary>;
  getSectionSatisfactionSummary(command: AnalysisFilterCommand): Promise<SectionSummary[]>;
  getQuestionSatisfactionSummary(command: AnalysisFilterCommand): Promise<QuestionSummary[]>;
  getChoiceDistribution(command: AnalysisFilterCommand): Promise<ChoiceDistribution[]>;
  getGroupCompareSummary(command: GroupCompareFilterCommand): Promise<GroupCompareResult[]>;
  getPriorityTop5(command: AnalysisFilterCommand): Promise<PriorityIssue[]>;
  getBorichSummary(command: AnalysisFilterCommand): Promise<BorichResult[]>;
  getLocusSummary(command: AnalysisFilterCommand): Promise<LocusPoint[]>;
  getHeatmapPoints(command: HeatmapFilterCommand): Promise<HeatmapPoint[]>;
  listImageTagAnswers(command: ImageTagAnswerFilterCommand): Promise<PaginatedResult<ImageTagAnswer>>;
  listIdentityResponses(command: IdentityResponseFilterCommand): Promise<PaginatedResult<IdentityResponse>>;
  getTextGroups(command: TextAnswerFilterCommand): Promise<TextGroup[]>;
  listTextAnswers(command: TextAnswerFilterCommand): Promise<PaginatedResult<TextAnswer>>;
}
