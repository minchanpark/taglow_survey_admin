import type { JsonRecord, LocalizedText } from "./common";
import type { Question } from "./question";
import type { SurveyAsset } from "./asset";
import type { SurveySection } from "./section";

export type SurveyStatus = "draft" | "published" | "closed" | "archived";
export type SurveyAccessRole = "owner" | "manager" | "editor" | "viewer";
export type SurveyCollaboratorRole = "manager" | "editor" | "viewer";

export type SurveySettings = JsonRecord;

export type Survey = Readonly<{
  id: string;
  title: string;
  description?: LocalizedText;
  status: SurveyStatus;
  publicSlug?: string;
  publicCode?: string;
  versionGroupId: string;
  versionNumber: number;
  parentSurveyId?: string;
  isLatestVersion: boolean;
  settings: SurveySettings;
  createdBy: string;
  publishedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  accessRole: SurveyAccessRole;
}>;

export type SurveyDetail = Readonly<{
  survey: Survey;
  sections: SurveySection[];
  questions: Question[];
  assets: SurveyAsset[];
}>;

export function getSurveyPublicIdentifier(survey: Pick<Survey, "publicSlug" | "publicCode">): string | undefined {
  return survey.publicSlug?.trim() || survey.publicCode?.trim() || undefined;
}

export function getSurveyPublicPath(survey: Pick<Survey, "publicSlug" | "publicCode">): string | undefined {
  const identifier = getSurveyPublicIdentifier(survey);
  return identifier ? `/survey/${encodeURIComponent(identifier)}` : undefined;
}

export type SurveyCollaborator = Readonly<{
  id: string;
  surveyId: string;
  email: string;
  role: SurveyCollaboratorRole;
  invitedBy?: string;
  createdAt: string;
  updatedAt: string;
  revokedAt?: string;
}>;

export function canEditSurvey(accessRole: SurveyAccessRole): boolean {
  return accessRole === "owner" || accessRole === "manager" || accessRole === "editor";
}

export function canInviteSurvey(accessRole: SurveyAccessRole): boolean {
  return accessRole === "owner" || accessRole === "manager";
}

export function canManageSurvey(accessRole: SurveyAccessRole): boolean {
  return accessRole === "owner";
}

export function getSurveyAccessRoleLabel(accessRole: SurveyAccessRole): string {
  if (accessRole === "owner") return "내 설문";
  if (accessRole === "manager") return "초대 가능";
  if (accessRole === "editor") return "작업 가능";
  return "결과보기";
}
