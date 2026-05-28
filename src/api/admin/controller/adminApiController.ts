import type {
  AdminMember,
  AdminSessionState,
  AdminSignInCommand,
  AnalysisFilterCommand,
  BorichResult,
  CreateQuestionCommand,
  CreateSectionCommand,
  CreateSurveyCommand,
  FilterOptions,
  HeatmapFilterCommand,
  HeatmapPoint,
  PreviewSurvey,
  PreviewSurveyCommand,
  QuestionSetImportCommand,
  QuestionSetImportPreview,
  QuestionSetImportPreviewCommand,
  QuestionSetImportResult,
  PublishValidationResult,
  Question,
  ReorderQuestionsCommand,
  ReorderSectionsCommand,
  SectionSummary,
  Survey,
  SurveyAsset,
  SurveyDetail,
  SurveySection,
  TextAnswer,
  TextAnswerFilterCommand,
  UpdateQuestionCommand,
  UpdateSectionCommand,
  UpdateSurveyCommand,
  UploadSurveyImageCommand,
} from "../model";

export interface AdminApiController {
  getAdminSessionState(): Promise<AdminSessionState>;
  getCurrentAdmin(): Promise<AdminMember | null>;
  signInWithGoogle(command: AdminSignInCommand): Promise<void>;
  signOut(): Promise<void>;

  listSurveys(): Promise<Survey[]>;
  getSurveyDetail(surveyId: string): Promise<SurveyDetail>;
  createSurvey(command: CreateSurveyCommand): Promise<Survey>;
  updateSurvey(command: UpdateSurveyCommand): Promise<Survey>;
  deleteDraftSurvey(surveyId: string): Promise<void>;

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
  getSectionSatisfactionSummary(command: AnalysisFilterCommand): Promise<SectionSummary[]>;
  getBorichSummary(command: AnalysisFilterCommand): Promise<BorichResult[]>;
  getHeatmapPoints(command: HeatmapFilterCommand): Promise<HeatmapPoint[]>;
  listTextAnswers(command: TextAnswerFilterCommand): Promise<TextAnswer[]>;
}
