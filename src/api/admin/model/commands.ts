import type { JsonRecord, LocalizedText } from "./common";
import type { AnalysisFilters, GroupCompareFilters, HeatmapFilters, IdentityResponseFilters, IndividualResponseFilters, TextAnswerFilters } from "./analysis";
import type { QuestionConfig, QuestionType, QuestionValidation, MetricType } from "./question";
import type { SectionType } from "./section";
import type { SurveyCollaboratorRole, SurveySettings, SurveyStatus } from "./survey";
import type { PreviewOptions } from "./preview";
import type { ApprovableAdminRole, UpgradableAdminRole } from "./adminMember";

export type CreateSurveyCommand = Readonly<{
  title: LocalizedText;
  description?: LocalizedText;
  settings?: SurveySettings;
}>;

export type UpdateSurveyCommand = Readonly<{
  surveyId: string;
  title?: LocalizedText;
  description?: LocalizedText;
  status?: SurveyStatus;
  publicSlug?: string;
  publicCode?: string;
  startsAt?: string;
  endsAt?: string;
  settings?: SurveySettings;
}>;

export type CreateSectionCommand = Readonly<{
  surveyId: string;
  sectionKey: string;
  title: LocalizedText;
  description?: LocalizedText;
  orderIndex: number;
  sectionType?: SectionType;
  settings?: JsonRecord;
}>;

export type UpdateSectionCommand = Readonly<{
  sectionId: string;
  sectionKey?: string;
  title?: LocalizedText;
  description?: LocalizedText;
  orderIndex?: number;
  sectionType?: SectionType;
  settings?: JsonRecord;
}>;

export type ReorderSectionsCommand = Readonly<{
  surveyId: string;
  sectionIds: string[];
}>;

export type CreateQuestionCommand = Readonly<{
  surveyId: string;
  sectionId: string;
  questionKey: string;
  questionType: QuestionType;
  title: LocalizedText;
  description?: LocalizedText;
  orderIndex: number;
  isRequired?: boolean;
  metricType?: MetricType;
  topicKey?: string;
  spaceKey?: string;
  config?: QuestionConfig;
  validation?: QuestionValidation;
}>;

export type UpdateQuestionCommand = Readonly<{
  questionId: string;
  questionKey?: string;
  questionType?: QuestionType;
  title?: LocalizedText;
  description?: LocalizedText;
  orderIndex?: number;
  isRequired?: boolean;
  metricType?: MetricType;
  topicKey?: string;
  spaceKey?: string;
  config?: QuestionConfig;
  validation?: QuestionValidation;
}>;

export type ReorderQuestionsCommand = Readonly<{
  surveyId: string;
  sectionId: string;
  questionIds: string[];
}>;

export type UploadSurveyImageCommand = Readonly<{
  surveyId: string;
  file: File;
  sectionId?: string;
  questionId?: string;
  metadata?: JsonRecord;
}>;

export type PreviewSurveyCommandInput = Readonly<{
  surveyId: string;
  options: PreviewOptions;
}>;

export type AnalysisFilterCommand = Readonly<{
  surveyId: string;
  filters: AnalysisFilters;
}>;

export type HeatmapFilterCommand = Readonly<{
  surveyId: string;
  filters: HeatmapFilters;
}>;

export type GroupCompareFilterCommand = Readonly<{
  surveyId: string;
  filters: GroupCompareFilters;
}>;

export type TextAnswerFilterCommand = Readonly<{
  surveyId: string;
  filters: TextAnswerFilters;
}>;

export type ImageTagAnswerFilterCommand = Readonly<{
  surveyId: string;
  filters: HeatmapFilters;
}>;

export type IdentityResponseFilterCommand = Readonly<{
  surveyId: string;
  filters: IdentityResponseFilters;
}>;

export type IndividualResponseFilterCommand = Readonly<{
  surveyId: string;
  filters: IndividualResponseFilters;
}>;

export type ApproveAdminMemberCommand = Readonly<{
  memberId: string;
  role: ApprovableAdminRole;
}>;

export type UpdateAdminMemberRoleCommand = Readonly<{
  memberId: string;
  role: UpgradableAdminRole;
}>;

export type DeleteAdminMemberCommand = Readonly<{
  memberId: string;
}>;

export type InviteSurveyCollaboratorCommand = Readonly<{
  surveyId: string;
  email: string;
  role: SurveyCollaboratorRole;
}>;

export type UpdateSurveyCollaboratorRoleCommand = Readonly<{
  collaboratorId: string;
  surveyId: string;
  role: SurveyCollaboratorRole;
}>;

export type RevokeSurveyCollaboratorCommand = Readonly<{
  collaboratorId: string;
  surveyId: string;
}>;
